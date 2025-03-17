# now_trending.py

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, window, from_json, desc, expr, current_timestamp, to_json, struct, from_unixtime
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType
from pyspark.sql.window import Window
from pyspark.sql.functions import row_number

# Create SparkSession
spark = SparkSession.builder \
    .appName("NowTrendingSongs") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

# Read from Kafka
kafka_df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "music_events") \
    .option("startingOffsets", "latest") \
    .load()

# Define Schema
schema = StructType([
    StructField("song_id", StringType(), True),
    StructField("timestamp", DoubleType(), True),  # Unix timestamp
    StructField("region", StringType(), True),
    StructField("action", StringType(), True)
])

# Parse JSON
json_df = kafka_df.selectExpr("CAST(value AS STRING) as json_str")
parsed_df = json_df.select(from_json(col("json_str"), schema).alias("data"))
events_df = parsed_df.select("data.*")

# ✅ Correct Timestamp Conversion
events_df = events_df.withColumn("event_time", from_unixtime(col("timestamp")).cast(TimestampType()))

# Filtering only "play" events
plays_df = events_df.filter(col("action") == "play")

# Define time window - Change to "1 minute" or "10 minutes" if needed
windowed_df = plays_df \
    .withWatermark("event_time", "5 minutes") \
    .groupBy(
        window(col("event_time"), "5 minutes"),  # Change to "1 minute" or "10 minutes" to adjust
        col("region"),
        col("song_id")
    ) \
    .count()

# Compute skip ratio
skip_df = events_df.filter(col("action") == "skip") \
                   .groupBy(col("song_id")) \
                   .count() \
                   .withColumnRenamed("count", "skip_count")

play_df = events_df.filter(col("action") == "play") \
                   .groupBy(col("song_id")) \
                   .count() \
                   .withColumnRenamed("count", "play_count")

skip_ratio_df = play_df.join(skip_df, "song_id", "left_outer") \
                       .fillna(0, subset=["skip_count"]) \
                       .withColumn("skip_ratio", col("skip_count") / (col("play_count") + col("skip_count")))

# Function to process each batch
def process_batch(batch_df, batch_id):
    """
    This function is called for each micro-batch.
    We rank by 'count' within each region & window and pick the top 3.
    """
    if batch_df.rdd.isEmpty():
        print("No data in this batch.")
        return

    # Partition by region + time window
    w = Window.partitionBy("region", "window").orderBy(desc("count"))

    ranked_df = batch_df.withColumn("rn", row_number().over(w)) \
                        .filter(col("rn") <= 3)

    print(f"=== Batch: {batch_id} ===")
    ranked_df.show(truncate=False)

    # Prepare results for Kafka
    output_df = ranked_df.select(to_json(struct("window", "region", "song_id", "count")).alias("value"))

    # Write top trending songs to Kafka
    output_df.write \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "localhost:9092") \
        .option("topic", "now_trending_results") \
        .save()

# Write Stream with adjustable micro-batch interval
query = windowed_df \
    .writeStream \
    .outputMode("update") \
    .foreachBatch(process_batch) \
    .trigger(processingTime='1 second') \
    .start()

query.awaitTermination()
