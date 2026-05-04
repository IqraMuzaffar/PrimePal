// auth-pages.jsx — Login, Signup, Forgot Password (2 visual styles)
const { useState } = React;

const Input = ({ label, type='text', placeholder, value, onChange, hint }) => (
  <div style={{ marginBottom:16 }}>
    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>{label}</label>
    <input
      type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:14, color:'#111827', fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#fff', transition:'border-color 0.14s' }}
      onFocus={e => e.target.style.borderColor='#4361ee'}
      onBlur={e => e.target.style.borderColor='#e5e7eb'}
    />
    {hint && <div style={{ fontSize:11.5, color:'#9ca3af', marginTop:4 }}>{hint}</div>}
  </div>
);

const AuthBtn = ({ children, onClick, secondary }) => (
  <button onClick={onClick} style={{
    width:'100%', padding:'12px', borderRadius:10, border: secondary ? '1.5px solid #e5e7eb' : 'none',
    background: secondary ? '#fff' : '#4361ee', color: secondary ? '#374151' : '#fff',
    fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
    transition:'all 0.14s', marginBottom: secondary ? 0 : 10
  }}>
    {children}
  </button>
);

const BrandPanel = () => (
  <div style={{
    flex:1, background:'linear-gradient(160deg, #0f1729 0%, #1a2e6e 100%)',
    display:'flex', flexDirection:'column', justifyContent:'space-between',
    padding:'40px', minHeight:'100%', position:'relative', overflow:'hidden'
  }}>
    {/* Decorative circles */}
    {[['-80px','-80px',300,'rgba(67,97,238,0.15)'],['-20px','60%',180,'rgba(124,158,255,0.1)'],['60%','80%',220,'rgba(67,97,238,0.12)']].map(([t,l,s,bg],i)=>(
      <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:bg, pointerEvents:'none' }} />
    ))}
    {/* Logo */}
    <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative', zIndex:1 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#4361ee,#7c9eff)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', fontSize:17, fontFamily:"'Space Grotesk',sans-serif" }}>P</div>
      <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:20, color:'#fff', letterSpacing:'-0.3px' }}>PrimePal</span>
    </div>
    {/* Tagline */}
    <div style={{ position:'relative', zIndex:1 }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:700, color:'#fff', lineHeight:1.3, marginBottom:12 }}>
        Empowering teachers,<br/>one classroom at a time.
      </div>
      <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
        Manage your classes, track student progress, and deliver AI-powered learning — all in one place.
      </div>
      <div style={{ display:'flex', gap:20, marginTop:28 }}>
        {[['500+','Schools'],['12k+','Teachers'],['98%','Satisfaction']].map(([n,l])=>(
          <div key={l}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:800, color:'#a5b8ff' }}>{n}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── LOGIN ─────────────────────────────────────────────────────
const LoginForm = ({ onGoSignup, onGoForgot, onLogin, style }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');

  if (style === 'centered') return (
    <div style={{ minHeight:'100vh', background:'#0f1729', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", padding:24 }}>
      <div style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:20, padding:'40px 36px', boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#4361ee,#7c9eff)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', fontSize:20, fontFamily:"'Space Grotesk',sans-serif", margin:'0 auto 12px' }}>P</div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:22, color:'#0f1729' }}>Welcome back</div>
          <div style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>Sign in to your PrimePal account</div>
        </div>
        <Input label="Email address" type="email" placeholder="you@school.edu.ng" value={email} onChange={setEmail} />
        <Input label="Password" type="password" placeholder="Enter your password" value={pass} onChange={setPass} />
        <div style={{ textAlign:'right', marginTop:-8, marginBottom:18 }}>
          <span onClick={onGoForgot} style={{ fontSize:12.5, color:'#4361ee', cursor:'pointer', fontWeight:600 }}>Forgot password?</span>
        </div>
        <AuthBtn onClick={onLogin}>Sign In</AuthBtn>
        <div style={{ textAlign:'center', fontSize:13, color:'#6b7280', marginTop:16 }}>
          Don't have an account? <span onClick={onGoSignup} style={{ color:'#4361ee', fontWeight:600, cursor:'pointer' }}>Sign up</span>
        </div>
      </div>
    </div>
  );

  // Split screen
  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'DM Sans',sans-serif" }}>
      <BrandPanel />
      <div style={{ width:460, flexShrink:0, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 48px' }}>
        <div style={{ width:'100%' }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:24, color:'#0f1729', marginBottom:6 }}>Welcome back 👋</div>
            <div style={{ fontSize:13.5, color:'#9ca3af' }}>Sign in to your teacher account</div>
          </div>
          <Input label="Email address" type="email" placeholder="you@school.edu.ng" value={email} onChange={setEmail} />
          <Input label="Password" type="password" placeholder="Enter your password" value={pass} onChange={setPass} />
          <div style={{ textAlign:'right', marginTop:-8, marginBottom:20 }}>
            <span onClick={onGoForgot} style={{ fontSize:12.5, color:'#4361ee', cursor:'pointer', fontWeight:600 }}>Forgot password?</span>
          </div>
          <AuthBtn onClick={onLogin}>Sign In</AuthBtn>
          <div style={{ textAlign:'center', fontSize:13, color:'#6b7280', marginTop:16 }}>
            Don't have an account? <span onClick={onGoSignup} style={{ color:'#4361ee', fontWeight:600, cursor:'pointer' }}>Sign up free</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── SIGNUP ────────────────────────────────────────────────────
const SignupForm = ({ onGoLogin, onSignup, style }) => {
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');

  if (style === 'centered') return (
    <div style={{ minHeight:'100vh', background:'#0f1729', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", padding:24 }}>
      <div style={{ width:'100%', maxWidth:440, background:'#fff', borderRadius:20, padding:'40px 36px', boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#4361ee,#7c9eff)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', fontSize:20, fontFamily:"'Space Grotesk',sans-serif", margin:'0 auto 12px' }}>P</div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:22, color:'#0f1729' }}>Create your account</div>
          <div style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>Start teaching smarter with PrimePal</div>
        </div>
        <Input label="Full name" placeholder="Ms. Adeola Bello" value={name} onChange={setName} />
        <Input label="Email address" type="email" placeholder="you@school.edu.ng" value={email} onChange={setEmail} />
        <Input label="Password" type="password" placeholder="Min. 8 characters" value={pass} onChange={setPass} hint="Must be at least 8 characters" />
        <AuthBtn onClick={onSignup}>Create Account</AuthBtn>
        <div style={{ textAlign:'center', fontSize:13, color:'#6b7280', marginTop:12 }}>
          Already have an account? <span onClick={onGoLogin} style={{ color:'#4361ee', fontWeight:600, cursor:'pointer' }}>Sign in</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'DM Sans',sans-serif" }}>
      <BrandPanel />
      <div style={{ width:480, flexShrink:0, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 48px' }}>
        <div style={{ width:'100%' }}>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:24, color:'#0f1729', marginBottom:6 }}>Create your account</div>
            <div style={{ fontSize:13.5, color:'#9ca3af' }}>Start teaching smarter with PrimePal</div>
          </div>
          <Input label="Full name" placeholder="Ms. Adeola Bello" value={name} onChange={setName} />
          <Input label="Email address" type="email" placeholder="you@school.edu.ng" value={email} onChange={setEmail} />
          <Input label="Password" type="password" placeholder="Min. 8 characters" value={pass} onChange={setPass} hint="Must be at least 8 characters" />
          <AuthBtn onClick={onSignup}>Create Free Account</AuthBtn>
          <div style={{ textAlign:'center', fontSize:13, color:'#6b7280', marginTop:16 }}>
            Already have an account? <span onClick={onGoLogin} style={{ color:'#4361ee', fontWeight:600, cursor:'pointer' }}>Sign in</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
const ForgotForm = ({ onGoLogin, style }) => {
  const [email, setEmail] = useState('');
  const [sent,  setSent]  = useState(false);
  return (
    <div style={{ minHeight:'100vh', background: style==='centered' ? '#0f1729' : '#f0f2f8', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", padding:24 }}>
      <div style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:20, padding:'40px 36px', boxShadow:'0 8px 40px rgba(0,0,0,0.12)' }}>
        {sent ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#d1fae5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
            </div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:20, color:'#0f1729', marginBottom:8 }}>Check your email</div>
            <div style={{ fontSize:13.5, color:'#6b7280', marginBottom:24, lineHeight:1.6 }}>We've sent a password reset link to <strong>{email || 'your email'}</strong></div>
            <AuthBtn onClick={onGoLogin}>Back to Sign In</AuthBtn>
          </div>
        ) : (
          <>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:22, color:'#0f1729', marginBottom:6 }}>Forgot password?</div>
              <div style={{ fontSize:13.5, color:'#9ca3af', lineHeight:1.5 }}>Enter your email and we'll send you a reset link.</div>
            </div>
            <Input label="Email address" type="email" placeholder="you@school.edu.ng" value={email} onChange={setEmail} />
            <AuthBtn onClick={() => setSent(true)}>Send Reset Link</AuthBtn>
            <div style={{ textAlign:'center', marginTop:12 }}>
              <span onClick={onGoLogin} style={{ fontSize:13, color:'#4361ee', fontWeight:600, cursor:'pointer' }}>← Back to Sign In</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Auth Router ───────────────────────────────────────────────
const AuthPages = ({ onLogin, authStyle='split' }) => {
  const [view, setView] = useState('login');
  if (view === 'login')   return <LoginForm  onGoSignup={()=>setView('signup')} onGoForgot={()=>setView('forgot')} onLogin={onLogin}         style={authStyle} />;
  if (view === 'signup')  return <SignupForm onGoLogin={()=>setView('login')}  onSignup={onLogin}                                             style={authStyle} />;
  if (view === 'forgot')  return <ForgotForm onGoLogin={()=>setView('login')}                                                                 style={authStyle} />;
  return null;
};

Object.assign(window, { AuthPages });
