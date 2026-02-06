import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Droplets, TrendingUp, Users, Award } from 'lucide-react';
import toast from '../../utils/toast';

export default function PartnerRegisterPage() {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', phone:'', sponsorCode:'', taxId:'', companyName:'', iban:'', bic:'', tcAccepted:false });
  const [loading, setLoading] = useState(false);
  const { registerPartner } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tcAccepted) return toast.error('Bitte AGB akzeptieren');
    setLoading(true);
    try {
      await registerPartner(form);
      toast.success('Partner-Registrierung erfolgreich!');
      navigate('/partner/dashboard');
    } catch (err) { toast.error(err.response?.data?.error || 'Registrierung fehlgeschlagen'); }
    finally { setLoading(false); }
  };

  const benefits = [
    { icon: TrendingUp, title: 'Bis zu 36% Provision', desc: 'Attraktives Provisionsmodell mit 7 Rängen' },
    { icon: Users, title: 'Team aufbauen', desc: 'Verdienen Sie an Teamverkäufen durch Differenzprovisionen' },
    { icon: Award, title: 'Rang-Boni', desc: 'Einmalige Boni bei Rangaufstiegen bis zu 2.000 EUR' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <div className="flex items-center gap-2 mb-6"><Droplets className="w-8 h-8 text-clyr-teal" /><h1 className="text-3xl font-bold">CLYR Partner werden</h1></div>
          <p className="text-gray-600 mb-8">Starten Sie Ihr eigenes Business mit CLYR. Profitieren Sie von attraktiven Provisionen und bauen Sie Ihr Team auf.</p>
          <div className="space-y-6">
            {benefits.map((b, i) => (
              <div key={i} className="flex gap-4"><div className="w-12 h-12 bg-clyr-light rounded-xl flex items-center justify-center flex-shrink-0"><b.icon className="w-6 h-6 text-clyr-teal" /></div><div><h3 className="font-semibold">{b.title}</h3><p className="text-sm text-gray-500">{b.desc}</p></div></div>
            ))}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-xl font-semibold">Registrierung</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Vorname *</label><input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="input-field" required /></div>
            <div><label className="text-sm font-medium block mb-1">Nachname *</label><input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="input-field" required /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">E-Mail *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" required /></div>
          <div><label className="text-sm font-medium block mb-1">Telefon</label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" /></div>
          <div><label className="text-sm font-medium block mb-1">Passwort *</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" required minLength={8} /></div>
          <div><label className="text-sm font-medium block mb-1">Empfehlungscode (Sponsor)</label><input value={form.sponsorCode} onChange={e => setForm({...form, sponsorCode: e.target.value.toUpperCase()})} className="input-field" placeholder="z.B. CLYR0001" maxLength={8} /></div>
          <div><label className="text-sm font-medium block mb-1">Firma (optional)</label><input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="input-field" /></div>
          <div><label className="text-sm font-medium block mb-1">Steuernummer (optional)</label><input value={form.taxId} onChange={e => setForm({...form, taxId: e.target.value})} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">IBAN</label><input value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} className="input-field" /></div>
            <div><label className="text-sm font-medium block mb-1">BIC</label><input value={form.bic} onChange={e => setForm({...form, bic: e.target.value})} className="input-field" /></div>
          </div>
          <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" checked={form.tcAccepted} onChange={e => setForm({...form, tcAccepted: e.target.checked})} className="mt-1" /><span className="text-sm">Ich akzeptiere die <Link to="/agb" className="text-clyr-teal" target="_blank">AGB</Link> und <Link to="/datenschutz" className="text-clyr-teal" target="_blank">Datenschutzerklärung</Link> *</span></label>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">{loading ? 'Registrieren...' : 'Als Partner registrieren'}</button>
          <p className="text-sm text-center text-gray-500">Bereits Partner? <Link to="/login" className="text-clyr-teal font-medium">Anmelden</Link></p>
        </form>
      </div>
    </div>
  );
}
