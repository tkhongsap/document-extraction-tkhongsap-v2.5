import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { UserCircle, Briefcase, GraduationCap, Award, ArrowRight, Play, Sparkles, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: 0.4 + i * 0.15,
      ease: [0.16, 1, 0.3, 1] as const
    }
  })
};

interface HeroRecruitmentProps {
  className?: string;
}

export function HeroRecruitment({ className }: HeroRecruitmentProps) {
  const { t, language } = useLanguage();

  const handleLogin = () => {
    window.location.href = "/login";
  };

  const benefits = [
    { icon: CheckCircle2, text: language === 'th' ? 'ดึงข้อมูลได้ในไม่กี่วินาที' : 'Extract data in seconds' },
    { icon: CheckCircle2, text: language === 'th' ? 'รองรับไฟล์ PDF, Word, รูปภาพ' : 'Supports PDF, Word, images' },
    { icon: CheckCircle2, text: language === 'th' ? 'แม่นยำ 99.2% สำหรับภาษาไทย-อังกฤษ' : '99.2% accuracy for Thai-English' },
  ];

  return (
    <section className={cn('relative min-h-[92vh] overflow-hidden', className)}
      style={{
        background: 'linear-gradient(135deg, hsl(222 47% 6%) 0%, hsl(224 60% 10%) 25%, hsl(230 50% 14%) 50%, hsl(240 45% 16%) 75%, hsl(250 40% 18%) 100%)'
      }}
    >
      {/* Layered background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Ambient gradient orbs */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-violet-500/6 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-15%] left-[20%] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
        </div>
        {/* Fine dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="container relative mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left: Content */}
          <motion.div
            className="lg:col-span-6 xl:col-span-6 space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Feature Badge */}
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/20 backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-sm font-semibold tracking-wide text-blue-300">
                  {language === 'th' ? 'ความแม่นยำในการดึงข้อมูล 99.2%' : '99.2% Extraction Accuracy'}
                </span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display text-white leading-[1.08] tracking-tight"
            >
              <span className="block">
                {language === 'th' ? 'เปลี่ยนเอกสารเป็น' : 'Transform Documents'}
              </span>
              <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
                {language === 'th' ? 'ข้อมูลที่ใช้งานได้ทันที' : 'Into Actionable Data'}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-lg lg:text-xl text-slate-400 max-w-xl leading-relaxed"
            >
              {language === 'th'
                ? 'AI ระดับองค์กรดึงข้อมูลจากเอกสารภาษาไทยและอังกฤษด้วยความแม่นยำสูงสุด ประมวลผลใบแจ้งหนี้ สัญญา เรซูเม่ และรายการเดินบัญชีในไม่กี่วินาที'
                : 'Enterprise-grade AI extracts data from Thai & English documents with unmatched precision. Process invoices, contracts, resumes, and bank statements in seconds.'}
            </motion.p>

            {/* Benefits List */}
            <motion.div variants={itemVariants} className="space-y-3">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <benefit.icon className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-base">{benefit.text}</span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 pt-2"
            >
              <Button
                size="lg"
                onClick={handleLogin}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white h-14 px-10 text-base font-semibold shadow-xl shadow-blue-600/25 border border-blue-400/20 transition-all duration-300 hover:shadow-blue-500/30 hover:shadow-2xl"
              >
                {language === 'th' ? 'ลองใช้ฟรี' : 'Try for Free'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 h-14 px-8 text-base backdrop-blur-sm transition-all duration-300"
              >
                <Play className="mr-2 h-5 w-5" />
                {language === 'th' ? 'ดูตัวอย่าง' : 'Watch Demo'}
              </Button>
            </motion.div>
          </motion.div>

          {/* Right: Document Preview Cards */}
          <div className="lg:col-span-6 xl:col-span-6 relative">
            <div className="relative h-[480px] lg:h-[560px]">
              {/* Subtle glow behind cards */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/8 rounded-full blur-[100px]" />

              {/* Upload Card */}
              <motion.div
                custom={0}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="absolute top-0 left-0 w-72 bg-white/[0.06] backdrop-blur-2xl rounded-2xl p-5 shadow-2xl border border-white/[0.08] ring-1 ring-white/[0.05]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <UserCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Resume_TH.pdf</div>
                    <div className="text-xs text-white/40">{language === 'th' ? 'อัปโหลดแล้ว' : 'Uploaded'}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 rounded-full bg-white/10 w-full" />
                  <div className="h-2.5 rounded-full bg-white/8 w-4/5" />
                  <div className="h-2.5 rounded-full bg-white/5 w-3/5" />
                </div>
              </motion.div>

              {/* AI Processing Card */}
              <motion.div
                custom={1}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="absolute top-28 left-36 w-60 bg-white/[0.06] backdrop-blur-2xl rounded-2xl p-5 shadow-2xl border border-white/[0.08] ring-1 ring-white/[0.05]"
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-5 w-5 text-violet-400" />
                  </motion.div>
                  <span className="font-semibold text-white text-sm">
                    {language === 'th' ? 'AI กำลังดึงข้อมูล...' : 'AI Extracting...'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400"
                    initial={{ width: '0%' }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  />
                </div>
              </motion.div>

              {/* Extracted Data Card */}
              <motion.div
                custom={2}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="absolute bottom-0 right-0 w-80 bg-white rounded-2xl p-6 shadow-2xl shadow-black/20 border border-slate-200/50 ring-1 ring-black/5"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {language === 'th' ? 'ข้อมูลที่ดึงได้' : 'Extracted Data'}
                  </span>
                  <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold">99.2%</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <UserCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}</div>
                      <div className="text-sm font-semibold text-slate-900">{language === 'th' ? 'สมชาย ใจดี' : 'Somchai Jaidee'}</div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                    <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Briefcase className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">{language === 'th' ? 'ประสบการณ์ล่าสุด' : 'Latest Experience'}</div>
                      <div className="text-sm font-semibold text-slate-900">{language === 'th' ? 'Senior Developer @ SCB' : 'Senior Developer @ SCB'}</div>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                    <div className="h-8 w-8 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                      <GraduationCap className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">{language === 'th' ? 'การศึกษา' : 'Education'}</div>
                      <div className="text-sm font-semibold text-slate-900">{language === 'th' ? 'วิศวกรรมคอมพิวเตอร์ จุฬาฯ' : 'Computer Engineering, Chula'}</div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Award className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1.5">{language === 'th' ? 'ทักษะ' : 'Skills'}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Python', 'React', 'AWS', 'SQL'].map((skill) => (
                          <span key={skill} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-600 font-medium">
                    {language === 'th' ? 'ความเชื่อมั่นสูง' : 'High Confidence'}
                  </span>
                </div>
              </motion.div>

              {/* Floating accent particles */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <motion.circle
                  cx="180"
                  cy="200"
                  r="3"
                  fill="hsl(217, 91%, 60%)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.3 }}
                />
                <motion.circle
                  cx="250"
                  cy="280"
                  r="2.5"
                  fill="hsl(263, 70%, 50%)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.8 }}
                />
                <motion.circle
                  cx="320"
                  cy="350"
                  r="3"
                  fill="hsl(189, 94%, 43%)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1.3 }}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
