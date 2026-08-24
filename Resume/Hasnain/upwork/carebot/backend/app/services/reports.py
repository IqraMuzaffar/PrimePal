"""CareBot report generation — HTML templates for lab reports, prescriptions, visit summaries."""
from datetime import datetime


def _clinic_header(clinic: dict) -> str:
    return f"""
    <div style="text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: #0891b2; margin: 0;">{clinic.get('name', 'City Health Clinic')}</h1>
        <p style="margin: 5px 0; color: #666;">{clinic.get('address', '')}</p>
        <p style="margin: 5px 0; color: #666;">Phone: {clinic.get('phone', '')} | Email: {clinic.get('email', '')}</p>
    </div>
    """


def _page_wrapper(title: str, content: str) -> str:
    return f"""<!DOCTYPE html>
<html><head>
<title>{title}</title>
<style>
    body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }}
    table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
    th {{ background: #f5f5f5; font-weight: 600; }}
    .badge {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }}
    .normal {{ background: #dcfce7; color: #166534; }}
    .abnormal {{ background: #fef3c7; color: #92400e; }}
    .critical {{ background: #fecaca; color: #991b1b; }}
    .section {{ margin: 20px 0; }}
    .label {{ font-weight: 600; color: #555; }}
    .signature-line {{ border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; width: 250px; }}
    .rx-symbol {{ font-size: 28px; font-weight: bold; color: #0891b2; margin-bottom: 10px; }}
    .patient-info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 15px 0; }}
    .info-item {{ padding: 5px 0; }}
    @media print {{
        body {{ padding: 10px; }}
        .no-print {{ display: none; }}
    }}
</style>
</head><body>{content}</body></html>"""


def _patient_info_block(patient: dict) -> str:
    dob = patient.get('date_of_birth', '')
    age = ""
    if dob:
        try:
            birth = datetime.strptime(str(dob), "%Y-%m-%d")
            age = str(datetime.now().year - birth.year)
        except (ValueError, TypeError):
            age = str(dob)

    return f"""
    <div class="section">
        <h3 style="margin-bottom: 10px; color: #0891b2;">Patient Information</h3>
        <div class="patient-info-grid">
            <div class="info-item"><span class="label">Name:</span> {patient.get('name', 'N/A')}</div>
            <div class="info-item"><span class="label">Patient #:</span> {patient.get('patient_number', patient.get('id', 'N/A'))}</div>
            <div class="info-item"><span class="label">Age:</span> {age if age else 'N/A'}</div>
            <div class="info-item"><span class="label">Gender:</span> {patient.get('gender', 'N/A')}</div>
            <div class="info-item"><span class="label">Phone:</span> {patient.get('phone', 'N/A')}</div>
            <div class="info-item"><span class="label">Email:</span> {patient.get('email', 'N/A')}</div>
        </div>
    </div>
    """


def generate_lab_report(clinic: dict, patient: dict, lab_order: dict, results: list) -> str:
    """Generate an HTML lab report with clinic header, patient info, results table, and signature line."""
    ordered_at = lab_order.get('ordered_at', '')
    completed_at = lab_order.get('completed_at', '')
    try:
        if ordered_at:
            ordered_at = datetime.fromisoformat(str(ordered_at)).strftime("%B %d, %Y %I:%M %p")
    except (ValueError, TypeError):
        pass
    try:
        if completed_at:
            completed_at = datetime.fromisoformat(str(completed_at)).strftime("%B %d, %Y %I:%M %p")
    except (ValueError, TypeError):
        pass

    # Build results table rows
    rows_html = ""
    for r in results:
        status = r.get('status', 'normal')
        badge_class = status if status in ('normal', 'abnormal', 'critical') else 'normal'
        rows_html += f"""
        <tr>
            <td>{r.get('test_name', 'N/A')}</td>
            <td>{r.get('value', 'N/A')}</td>
            <td>{r.get('unit', '')}</td>
            <td>{r.get('reference_range', 'N/A')}</td>
            <td><span class="badge {badge_class}">{status.upper()}</span></td>
        </tr>
        """

    if not rows_html:
        rows_html = '<tr><td colspan="5" style="text-align:center; color:#999;">No results available</td></tr>'

    content = f"""
    {_clinic_header(clinic)}

    <h2 style="text-align: center; color: #333;">Laboratory Report</h2>

    {_patient_info_block(patient)}

    <div class="section">
        <h3 style="color: #0891b2;">Order Details</h3>
        <div class="patient-info-grid">
            <div class="info-item"><span class="label">Order ID:</span> {lab_order.get('id', 'N/A')}</div>
            <div class="info-item"><span class="label">Test Panel:</span> {lab_order.get('test_panel', 'N/A')}</div>
            <div class="info-item"><span class="label">Priority:</span> {lab_order.get('priority', 'routine').upper()}</div>
            <div class="info-item"><span class="label">Status:</span> {lab_order.get('status', 'N/A').upper()}</div>
            <div class="info-item"><span class="label">Ordered:</span> {ordered_at}</div>
            <div class="info-item"><span class="label">Completed:</span> {completed_at if completed_at else 'Pending'}</div>
            <div class="info-item"><span class="label">Ordered By:</span> Dr. {lab_order.get('doctor_name', 'N/A')}</div>
        </div>
    </div>

    <div class="section">
        <h3 style="color: #0891b2;">Test Results</h3>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
    </div>

    <div class="section" style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div>
            <div class="signature-line"></div>
            <p style="margin: 5px 0;">Lab Technician Signature</p>
        </div>
        <div>
            <div class="signature-line"></div>
            <p style="margin: 5px 0;">Dr. {lab_order.get('doctor_name', '_________________')}</p>
            <p style="margin: 2px 0; color: #666; font-size: 13px;">Authorized Physician</p>
        </div>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
        Report generated on {datetime.now().strftime("%B %d, %Y at %I:%M %p")} &mdash; {clinic.get('name', 'City Health Clinic')}
    </p>
    """

    return _page_wrapper(f"Lab Report - {patient.get('name', 'Patient')}", content)


def generate_prescription_report(clinic: dict, patient: dict, prescription: dict, items: list, doctor: dict) -> str:
    """Generate an HTML prescription with Rx symbol, medication table, and doctor signature."""
    issued_date = prescription.get('created_at', datetime.now().isoformat())
    try:
        issued_date = datetime.fromisoformat(str(issued_date)).strftime("%B %d, %Y")
    except (ValueError, TypeError):
        issued_date = str(issued_date)

    # Build medication table rows
    rows_html = ""
    for i, item in enumerate(items, start=1):
        rows_html += f"""
        <tr>
            <td>{i}</td>
            <td><strong>{item.get('drug_name', 'N/A')}</strong></td>
            <td>{item.get('dosage', 'N/A')}</td>
            <td>{item.get('frequency', 'N/A')}</td>
            <td>{item.get('duration', 'N/A')}</td>
            <td>{item.get('instructions', '')}</td>
        </tr>
        """

    if not rows_html:
        rows_html = '<tr><td colspan="6" style="text-align:center; color:#999;">No medications listed</td></tr>'

    doctor_name = doctor.get('name', prescription.get('doctor_name', 'N/A'))
    doctor_spec = doctor.get('specialization', '')
    doctor_reg = doctor.get('registration_number', doctor.get('license_number', ''))

    content = f"""
    {_clinic_header(clinic)}

    <h2 style="text-align: center; color: #333;">Prescription</h2>

    {_patient_info_block(patient)}

    <div class="section">
        <div class="patient-info-grid">
            <div class="info-item"><span class="label">Prescription #:</span> {prescription.get('id', 'N/A')}</div>
            <div class="info-item"><span class="label">Date:</span> {issued_date}</div>
            <div class="info-item"><span class="label">Diagnosis:</span> {prescription.get('diagnosis', 'N/A')}</div>
            <div class="info-item"><span class="label">Status:</span> {prescription.get('status', 'active').upper()}</div>
        </div>
    </div>

    <div class="section">
        <div class="rx-symbol">Rx</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
    </div>

    <div class="section">
        <p style="color: #666; font-size: 13px; border-left: 3px solid #0891b2; padding-left: 10px;">
            {prescription.get('notes', '')}
        </p>
    </div>

    <div class="section" style="margin-top: 50px;">
        <div class="signature-line"></div>
        <p style="margin: 5px 0; font-weight: 600;">Dr. {doctor_name}</p>
        {f'<p style="margin: 2px 0; color: #666; font-size: 13px;">{doctor_spec}</p>' if doctor_spec else ''}
        {f'<p style="margin: 2px 0; color: #666; font-size: 13px;">Reg. No: {doctor_reg}</p>' if doctor_reg else ''}
        <p style="margin: 2px 0; color: #666; font-size: 13px;">Date: {issued_date}</p>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
        This prescription is valid for 30 days from the date of issue &mdash; {clinic.get('name', 'City Health Clinic')}
    </p>
    """

    return _page_wrapper(f"Prescription - {patient.get('name', 'Patient')}", content)


def generate_visit_summary(clinic: dict, patient: dict, appointment: dict, visit_notes: dict, doctor: dict) -> str:
    """Generate an HTML visit summary with appointment info, clinical notes, and follow-up."""
    appt_date = appointment.get('date', '')
    try:
        appt_date = datetime.strptime(str(appt_date), "%Y-%m-%d").strftime("%B %d, %Y")
    except (ValueError, TypeError):
        appt_date = str(appt_date)

    doctor_name = doctor.get('name', appointment.get('doctor_name', 'N/A'))
    doctor_spec = doctor.get('specialization', '')

    def _section(heading: str, text: str) -> str:
        if not text:
            return ""
        return f"""
        <div class="section">
            <h4 style="color: #0891b2; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">{heading}</h4>
            <p style="margin: 5px 0; line-height: 1.6;">{text}</p>
        </div>
        """

    content = f"""
    {_clinic_header(clinic)}

    <h2 style="text-align: center; color: #333;">Visit Summary</h2>

    {_patient_info_block(patient)}

    <div class="section">
        <h3 style="color: #0891b2;">Appointment Details</h3>
        <div class="patient-info-grid">
            <div class="info-item"><span class="label">Date:</span> {appt_date}</div>
            <div class="info-item"><span class="label">Time:</span> {appointment.get('time_slot', 'N/A')}</div>
            <div class="info-item"><span class="label">Physician:</span> Dr. {doctor_name}</div>
            <div class="info-item"><span class="label">Specialization:</span> {doctor_spec}</div>
            <div class="info-item"><span class="label">Appointment #:</span> {appointment.get('id', 'N/A')}</div>
            <div class="info-item"><span class="label">Visit Type:</span> {appointment.get('reason', 'General Consultation')}</div>
        </div>
    </div>

    <div class="section">
        <h3 style="color: #0891b2;">Clinical Notes</h3>
        {_section("Chief Complaint", visit_notes.get('chief_complaint', ''))}
        {_section("Examination Findings", visit_notes.get('examination', ''))}
        {_section("Diagnosis", visit_notes.get('diagnosis', ''))}
        {_section("Treatment Plan", visit_notes.get('treatment_plan', ''))}
        {_section("Medications Prescribed", visit_notes.get('medications', ''))}
        {_section("Lab Tests Ordered", visit_notes.get('lab_tests', ''))}
    </div>

    {_section("Follow-Up Instructions", visit_notes.get('follow_up', ''))}

    <div class="section" style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div>
            <div class="signature-line"></div>
            <p style="margin: 5px 0; font-weight: 600;">Dr. {doctor_name}</p>
            {f'<p style="margin: 2px 0; color: #666; font-size: 13px;">{doctor_spec}</p>' if doctor_spec else ''}
            <p style="margin: 2px 0; color: #666; font-size: 13px;">Date: {appt_date}</p>
        </div>
        <div style="text-align: right;">
            <p style="color: #666; font-size: 13px;">Next Visit:</p>
            <p style="font-weight: 600;">{visit_notes.get('next_visit_date', '_________________')}</p>
        </div>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
        Summary generated on {datetime.now().strftime("%B %d, %Y at %I:%M %p")} &mdash; {clinic.get('name', 'City Health Clinic')}
    </p>
    """

    return _page_wrapper(f"Visit Summary - {patient.get('name', 'Patient')}", content)


def generate_patient_summary(
    clinic: dict,
    patient: dict,
    appointments: list,
    medications: list,
    lab_results: list,
) -> str:
    """Generate a full patient summary: demographics, conditions, allergies, meds, labs, visit history."""
    dob = patient.get('date_of_birth', '')
    age = ""
    if dob:
        try:
            birth = datetime.strptime(str(dob), "%Y-%m-%d")
            age = f"{datetime.now().year - birth.year} years"
        except (ValueError, TypeError):
            age = str(dob)

    # Medications table
    med_rows = ""
    for m in medications:
        items = m.get('items', [])
        if isinstance(items, str):
            import json
            try:
                items = json.loads(items)
            except Exception:
                items = []
        for item in items:
            med_rows += f"""
            <tr>
                <td>{item.get('drug_name', 'N/A')}</td>
                <td>{item.get('dosage', 'N/A')}</td>
                <td>{item.get('frequency', 'N/A')}</td>
                <td>{item.get('duration', 'N/A')}</td>
                <td>{m.get('status', 'active').upper()}</td>
                <td>Dr. {m.get('doctor_name', 'N/A')}</td>
            </tr>
            """
    if not med_rows:
        med_rows = '<tr><td colspan="6" style="text-align:center; color:#999;">No active medications</td></tr>'

    # Lab results table — show most recent result per order
    lab_rows = ""
    for order in lab_results[:10]:  # cap at 10 most recent
        ordered_at = order.get('ordered_at', '')
        try:
            ordered_at = datetime.fromisoformat(str(ordered_at)).strftime("%b %d, %Y")
        except (ValueError, TypeError):
            ordered_at = str(ordered_at)

        results = order.get('results', [])
        if isinstance(results, str):
            import json
            try:
                results = json.loads(results)
            except Exception:
                results = []

        result_summary = ", ".join(
            f"{r.get('test_name', '')}: {r.get('value', '')}{r.get('unit', '')}"
            for r in (results or [])
        ) or "Pending"

        lab_rows += f"""
        <tr>
            <td>{ordered_at}</td>
            <td>{order.get('test_panel', 'N/A')}</td>
            <td>{order.get('status', 'N/A').upper()}</td>
            <td style="font-size: 12px; color: #555;">{result_summary}</td>
        </tr>
        """
    if not lab_rows:
        lab_rows = '<tr><td colspan="4" style="text-align:center; color:#999;">No lab records</td></tr>'

    # Visit history table
    visit_rows = ""
    for appt in appointments[:10]:
        appt_date = appt.get('date', '')
        try:
            appt_date = datetime.strptime(str(appt_date), "%Y-%m-%d").strftime("%b %d, %Y")
        except (ValueError, TypeError):
            appt_date = str(appt_date)

        status = appt.get('status', 'N/A')
        status_color = {
            'completed': '#166534', 'confirmed': '#1e40af',
            'scheduled': '#92400e', 'cancelled': '#991b1b',
        }.get(status, '#333')

        visit_rows += f"""
        <tr>
            <td>{appt_date}</td>
            <td>{appt.get('time_slot', 'N/A')}</td>
            <td>Dr. {appt.get('doctor_name', 'N/A')}</td>
            <td>{appt.get('reason', 'Consultation')}</td>
            <td style="color: {status_color}; font-weight: 600;">{status.upper()}</td>
        </tr>
        """
    if not visit_rows:
        visit_rows = '<tr><td colspan="5" style="text-align:center; color:#999;">No visit history</td></tr>'

    content = f"""
    {_clinic_header(clinic)}

    <h2 style="text-align: center; color: #333;">Patient Medical Summary</h2>
    <p style="text-align: center; color: #666; font-size: 13px;">
        Generated: {datetime.now().strftime("%B %d, %Y at %I:%M %p")}
    </p>

    <div class="section">
        <h3 style="color: #0891b2;">Patient Demographics</h3>
        <div class="patient-info-grid">
            <div class="info-item"><span class="label">Full Name:</span> {patient.get('name', 'N/A')}</div>
            <div class="info-item"><span class="label">Patient #:</span> {patient.get('patient_number', patient.get('id', 'N/A'))}</div>
            <div class="info-item"><span class="label">Date of Birth:</span> {patient.get('date_of_birth', 'N/A')}</div>
            <div class="info-item"><span class="label">Age:</span> {age}</div>
            <div class="info-item"><span class="label">Gender:</span> {patient.get('gender', 'N/A')}</div>
            <div class="info-item"><span class="label">Blood Type:</span> {patient.get('blood_type', 'N/A')}</div>
            <div class="info-item"><span class="label">Phone:</span> {patient.get('phone', 'N/A')}</div>
            <div class="info-item"><span class="label">Email:</span> {patient.get('email', 'N/A')}</div>
            <div class="info-item" style="grid-column: span 2;"><span class="label">Address:</span> {patient.get('address', 'N/A')}</div>
        </div>
    </div>

    <div class="section">
        <h3 style="color: #0891b2;">Medical History</h3>
        <div class="patient-info-grid">
            <div class="info-item">
                <span class="label">Chronic Conditions:</span><br>
                {patient.get('chronic_conditions', 'None recorded')}
            </div>
            <div class="info-item">
                <span class="label">Allergies:</span><br>
                <span style="color: #991b1b;">{patient.get('allergies', 'None recorded')}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h3 style="color: #0891b2;">Current Medications</h3>
        <table>
            <thead>
                <tr>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Prescribed By</th>
                </tr>
            </thead>
            <tbody>{med_rows}</tbody>
        </table>
    </div>

    <div class="section">
        <h3 style="color: #0891b2;">Recent Lab Results</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Panel</th>
                    <th>Status</th>
                    <th>Results Summary</th>
                </tr>
            </thead>
            <tbody>{lab_rows}</tbody>
        </table>
    </div>

    <div class="section">
        <h3 style="color: #0891b2;">Visit History</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Physician</th>
                    <th>Reason</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>{visit_rows}</tbody>
        </table>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
        This is a confidential medical document. Unauthorized disclosure is prohibited. &mdash; {clinic.get('name', 'City Health Clinic')}
    </p>
    """

    return _page_wrapper(f"Patient Summary - {patient.get('name', 'Patient')}", content)
