import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { UserCircle, Briefcase, GraduationCap, Award, ArrowRight, Play, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: 0.5 + i * 0.12,
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
    window.location.href = "/api/login";
  };

  const benefits = [
    { icon: CheckCircle2, text: language === 'th' ? 'ดึงข้อมูลจากเรซูเม่ใน 3 วินาที' : 'Extract resume data in 3 seconds' },
    { icon: CheckCircle2, text: language === 'th' ? 'รองรับไฟล์ PDF, Word, รูปภาพ' : 'Supports PDF, Word, images' },
    { icon: CheckCircle2, text: language === 'th' ? 'แม่นยำ 99.2% สำหรับภาษาไทย-อังกฤษ' : '99.2% accuracy for Thai-English' },
  ];

  return (
    <section className={cn('relative min-h-[92vh] bg-gradient-to-br from-[hsl(192_85%_8%)] via-[hsl(192_75%_12%)] to-[hsl(192_65%_18%)] overflow-hidden', className)}>
      {/* Animated background patterns */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          <div className="absolute top-10 left-[10%] w-72 h-72 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 right-[15%] w-96 h-96 bg-[hsl(var(--gold))]/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-[30%] w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300">
                <UserCircle className="h-4 w-4" />
                <span className="text-sm font-semibold tracking-wide">
                  {language === 'th' ? 'ใหม่! ดึงข้อมูลเรซูเม่อัตโนมัติ' : 'NEW! Automated Resume Extraction'}
                </span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display text-white leading-[1.1]"
            >
              <span className="block">
                {language === 'th' ? 'เปลี่ยนเรซูเม่เป็น' : 'Transform Resumes'}
              </span>
              <span className="block bg-gradient-to-r from-teal-300 via-[hsl(var(--gold))] to-teal-200 bg-clip-text text-transparent">
                {language === 'th' ? 'ข้อมูลที่ใช้งานได้ทันที' : 'Into Actionable Data'}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-lg lg:text-xl text-white/70 max-w-xl leading-relaxed"
            >
              {language === 'th'
                ? 'AI ช่วยดึงข้อมูลจากเรซูเม่และ CV อัตโนมัติ ประวัติการทำงาน การศึกษา ทักษะ และข้อมูลติดต่อ พร้อมส่งออกเป็น Excel ได้ทันที'
                : 'AI-powered extraction from resumes and CVs. Work history, education, skills, and contact info—export to Excel instantly.'}
            </motion.p>

            {/* Benefits List */}
            <motion.div variants={itemVariants} className="space-y-3">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 text-white/80">
                  <benefit.icon className="h-5 w-5 text-teal-400 shrink-0" />
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
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white h-14 px-10 text-base font-semibold shadow-xl shadow-teal-500/30 border border-teal-400/20"
              >
                {language === 'th' ? 'ลองใช้ฟรี' : 'Try for Free'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white/20 text-white hover:bg-white/10 h-14 px-8 text-base"
              >
                <Play className="mr-2 h-5 w-5" />
                {language === 'th' ? 'ดูตัวอย่าง' : 'Watch Demo'}
              </Button>
            </motion.div>
          </motion.div>

          {/* Right: Resume Preview Cards */}
          <div className="lg:col-span-6 xl:col-span-6 relative">
            <div className="relative h-[480px] lg:h-[560px]">
              {/* Background glow effect */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-3xl" />

              {/* Resume Upload Card */}
              <motion.div
                custom={0}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="absolute top-0 left-0 w-72 bg-white/10 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-white/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <UserCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Resume_TH.pdf</div>
                    <div className="text-xs text-white/50">{language === 'th' ? 'อัปโหลดแล้ว' : 'Uploaded'}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 rounded-full bg-white/20 w-full" />
                  <div className="h-2.5 rounded-full bg-white/15 w-4/5" />
                  <div className="h-2.5 rounded-full bg-white/10 w-3/5" />
                </div>
              </motion.div>

              {/* AI Processing Card */}
              <motion.div
                custom={1}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="absolute top-28 left-36 w-60 bg-white/10 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-white/20"
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-6 w-6 text-[hsl(var(--gold))]" />
                  </motion.div>
                  <span className="font-semibold text-white text-sm">
                    {language === 'th' ? 'AI กำลังดึงข้อมูล...' : 'AI Extracting...'}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-teal-400 to-[hsl(var(--gold))]"
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
                className="absolute bottom-0 right-0 w-80 bg-white rounded-2xl p-6 shadow-2xl border border-gray-100"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {language === 'th' ? 'ข้อมูลที่ดึงได้' : 'Extracted Data'}
                  </span>
                  <div className="flex items-center gap-1.5 text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold">99.2%</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                    <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                      <UserCircle className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}</div>
                      <div className="text-sm font-semibold text-gray-900">{language === 'th' ? 'สมชาย ใจดี' : 'Somchai Jaidee'}</div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">{language === 'th' ? 'ประสบการณ์ล่าสุด' : 'Latest Experience'}</div>
                      <div className="text-sm font-semibold text-gray-900">{language === 'th' ? 'Senior Developer @ SCB' : 'Senior Developer @ SCB'}</div>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <GraduationCap className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">{language === 'th' ? 'การศึกษา' : 'Education'}</div>
                      <div className="text-sm font-semibold text-gray-900">{language === 'th' ? 'วิศวกรรมคอมพิวเตอร์ จุฬาฯ' : 'Computer Engineering, Chula'}</div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Award className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1.5">{language === 'th' ? 'ทักษะ' : 'Skills'}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Python', 'React', 'AWS', 'SQL'].map((skill) => (
                          <span key={skill} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
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

              {/* Floating particles */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <motion.circle
                  cx="180"
                  cy="200"
                  r="4"
                  fill="rgb(94, 234, 212)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                />
                <motion.circle
                  cx="250"
                  cy="280"
                  r="3"
                  fill="hsl(var(--gold))"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
                />
                <motion.circle
                  cx="320"
                  cy="350"
                  r="4"
                  fill="rgb(94, 234, 212)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 1.3 }}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
