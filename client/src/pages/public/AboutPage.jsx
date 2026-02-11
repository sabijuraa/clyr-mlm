// client/src/pages/public/AboutPage.jsx
// Premium "Über uns" page with founder bios, vision, mission
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Droplets, Shield, Sparkles, ArrowRight, Users, Target, Lightbulb } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }
  })
};

const AboutPage = () => {
  const { lang } = useLanguage();

  return (
    <div className="bg-white">

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-secondary-800 text-white">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-secondary-300 uppercase tracking-[0.2em] text-sm font-medium mb-6">
            Über CLYR
          </motion.p>
          <motion.h1 initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={1}
            className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight mb-6">
            Mehr als Technologie.
            <br />
            <span className="text-white">Eine Vision für besseres Wasser.</span>
          </motion.h1>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={2}
            className="text-lg md:text-xl text-secondary-200 max-w-3xl mx-auto leading-relaxed">
            CLYR vereint medizinisches Verständnis, technische Expertise und unternehmerische Vision –
            für eine neue Dimension von Wasserqualität.
          </motion.p>
        </div>
      </section>

      {/* ===== VISION ===== */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}>
              <p className="text-primary-500 uppercase tracking-[0.15em] text-sm font-semibold mb-4">Unsere Vision</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-800 leading-tight mb-6">
                Wasser neu gedacht.
              </h2>
              <p className="text-secondary-600 text-lg leading-relaxed mb-6">
                CLYR wurde gegruendet, um die Art und Weise zu veraendern, wie Menschen Wasser erleben.
                Unsere weltweit einzigartige Technologie liefert gefiltertes Sprudelwasser direkt aus dem Wasserhahn -
                eine Innovation, die es sonst nirgends gibt.
              </p>
              <p className="text-secondary-600 text-lg leading-relaxed">
                CLYR verbindet Innovation, Fachwissen und Lebensqualitaet - fuer Familien,
                fuer Gesundheitsbewusste und fuer Menschen, die mehr aus ihrem Alltag machen moechten.
              </p>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp} custom={2}
              className="grid grid-cols-2 gap-5">
              {[
                { icon: Heart, title: 'Gesundheit', desc: 'Reines Wasser für ein gesundes Leben' },
                { icon: Sparkles, title: 'Innovation', desc: 'Modernste Filtertechnologie' },
                { icon: Shield, title: 'Qualität', desc: 'Kompromisslose Verarbeitung' },
                { icon: Lightbulb, title: 'Einfachheit', desc: 'Alltagstauglich & komfortabel' },
              ].map((item, i) => (
                <motion.div key={item.title} variants={fadeUp} custom={i * 0.5}
                  className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="font-heading font-semibold text-secondary-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-secondary-500">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== FOUNDERS TOGETHER IMAGE ===== */}
      <section className="py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden shadow-2xl">
            <img src="/images/founders-together.jpeg" alt="Theresa Struger und Wolfgang Kronsteiner – Gründer von CLYR"
              className="w-full h-80 md:h-[32rem] object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-secondary-900/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <p className="text-white/80 text-sm uppercase tracking-wider mb-2">Die Gründer</p>
              <h3 className="text-white text-2xl md:text-3xl font-heading font-bold">
                Theresa Struger & Wolfgang Kronsteiner
              </h3>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== THERESA ===== */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-12 md:gap-16 items-start">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              className="md:col-span-2">
              <div className="relative">
                <div className="absolute -inset-4 bg-primary-100 rounded-3xl -rotate-3" />
                <img src="/images/theresa-struger.jpeg" alt="Theresa Struger"
                  className="relative rounded-2xl w-full object-cover shadow-xl" />
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp} custom={1}
              className="md:col-span-3">
              <p className="text-primary-500 uppercase tracking-[0.15em] text-sm font-semibold mb-3">Geschäftsführerin</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-800 mb-2">
                Theresa Struger
              </h2>
              <p className="text-secondary-500 mb-6">Kärnten · verheiratet · Mutter von drei Kindern</p>

              <div className="space-y-4 text-secondary-600 leading-relaxed">
                <p>
                  Theresa steht für eine neue Generation von Gesundheitsbewusstsein – alltagstauglich, modern und ehrlich.
                </p>
                <p>
                  Als Mutter von drei Kindern und mit ihrem medizinischen Hintergrund bringt sie nicht nur Fachwissen,
                  sondern vor allem praktische Lebenserfahrung in die Entwicklung der CLYR Systeme ein. Ihre Leidenschaft
                  gilt einem gesunden Zuhause, das sich leicht in den Familienalltag integrieren lässt – ohne komplizierte
                  Routinen oder Verzicht.
                </p>
                <p>
                  Seit mehreren Jahren beschäftigt sie sich intensiv mit Wasserqualität und deren Einfluss auf Gesundheit
                  und Wohlbefinden. Die Suche nach einer Lösung, die sowohl technisch überzeugt als auch alltagstauglich ist,
                  führte schließlich zur Mitentwicklung der heutigen CLYR Anlagen.
                </p>
                <p className="text-secondary-700 font-medium italic border-l-4 border-primary-400 pl-5 py-2">
                  CLYR ist für Theresa mehr als ein Unternehmen. Es ist ein Herzensprojekt, das aus persönlicher
                  Überzeugung entstanden ist – mit dem Wunsch, Menschen neue Möglichkeiten für Gesundheit,
                  Freiheit und Lebensqualität zu eröffnen.
                </p>
                <p>
                  Neben dem gesundheitlichen Aspekt ist es ihr besonders wichtig, Menschen die Chance zu geben,
                  sich beruflich neu zu orientieren und ein zweites finanzielles Standbein aufzubauen.
                  Für sie bedeutet Erfolg, gemeinsam zu wachsen.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== WOLFGANG ===== */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-12 md:gap-16 items-start">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp} custom={1}
              className="md:col-span-3 md:order-1">
              <p className="text-primary-500 uppercase tracking-[0.15em] text-sm font-semibold mb-3">Technik & Innovation</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-800 mb-2">
                Wolfgang Kronsteiner
              </h2>
              <p className="text-secondary-500 mb-6">Salzburg · verheiratet · Vater von zwei Kindern · Zertifizierter Trinkwasser-Hygienetechniker</p>

              <div className="space-y-4 text-secondary-600 leading-relaxed">
                <p>
                  Wolfgang Kronsteiner ist zertifizierter Trinkwasser-Hygienetechniker mit fundierter Erfahrung
                  in Installation, Technik und Wasserqualität. Durch seine offiziell anerkannte Qualifikation
                  stellt er sicher, dass unsere Systeme höchsten hygienischen und technischen Standards entsprechen –
                  für sicheres und hochwertiges Trinkwasser.
                </p>
                <p>
                  Als Installateur für Gas- und Wassertechnik kennt er die Anforderungen an moderne Wasserlösungen
                  aus der Praxis – von der Planung bis zur Umsetzung. Sein Fokus liegt auf Qualität, Sicherheit
                  und Innovation.
                </p>
                <p>
                  Er sorgt dafür, dass die CLYR Systeme nicht nur technisch auf höchstem Niveau funktionieren,
                  sondern auch langfristig zuverlässig und effizient arbeiten. Darüber hinaus treibt er
                  kontinuierlich die Weiterentwicklung neuer Technologien und Verbesserungen bestehender
                  Systeme voran.
                </p>
                <p className="text-secondary-700 font-medium italic border-l-4 border-primary-400 pl-5 py-2">
                  Sein Anspruch ist es, Wasserlösungen zu schaffen, die nicht nur den aktuellen Standards
                  entsprechen, sondern neue Maßstäbe setzen.
                </p>
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              className="md:col-span-2 md:order-2">
              <div className="relative">
                <div className="absolute -inset-4 bg-primary-100 rounded-3xl rotate-3" />
                <img src="/images/wolfgang-kronsteiner.jpeg" alt="Wolfgang Kronsteiner"
                  className="relative rounded-2xl w-full object-cover shadow-xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== TOGETHER ===== */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp}>
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-8">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-800 mb-6">
              Gemeinsam für eine neue Wasserqualität
            </h2>
            <p className="text-secondary-600 text-lg leading-relaxed mb-6">
              CLYR vereint medizinisches Verständnis, technische Expertise und unternehmerische Vision.
            </p>
            <p className="text-secondary-600 text-lg leading-relaxed mb-8">
              Während Theresa den Fokus auf Gesundheit, Lifestyle und Community legt, sorgt Wolfgang
              für technische Perfektion und Innovation. Zusammen bilden sie die Grundlage für eine Marke,
              die Qualität, Vertrauen und Zukunftsdenken verbindet.
            </p>
            <p className="text-xl font-heading font-semibold text-secondary-700 italic">
              Unser Anspruch ist es, Wasser nicht nur zu verbessern – sondern das Bewusstsein dafür zu verändern.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== MEHR ALS TECHNOLOGIE ===== */}
      <section className="py-20 md:py-28 bg-secondary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp}>
            <p className="text-secondary-300 uppercase tracking-[0.2em] text-sm font-medium mb-6">
              Mehr als Technologie
            </p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-8 leading-tight">
              CLYR steht für eine Bewegung hin zu
              <span className="text-white"> bewussterem Leben</span>, mehr Selbstbestimmung
              und nachhaltiger Gesundheit.
            </h2>
            <p className="text-secondary-200 text-lg leading-relaxed mb-6">
              Wir glauben daran, dass jeder Mensch Zugang zu hochwertigem Wasser haben sollte –
              unabhängig vom Lebensstil oder Alltag.
            </p>
            <p className="text-secondary-200 text-lg leading-relaxed mb-10">
              Und wir glauben daran, dass Innovation dann am stärksten ist,
              wenn sie das Leben einfacher macht.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/products"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-secondary-800 rounded-xl font-semibold hover:bg-primary-50 transition-colors">
                Produkte entdecken <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/partner/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors">
                Partner werden
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;
