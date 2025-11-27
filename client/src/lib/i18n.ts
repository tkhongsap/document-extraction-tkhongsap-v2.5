import { create } from 'zustand';

type Language = 'en' | 'th';

type Translations = {
  [key in Language]: {
    [key: string]: string;
  };
};

export const translations: Translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.pricing': 'Pricing',
    'nav.about': 'About',
    'nav.signin': 'Sign In',
    'nav.dashboard': 'Dashboard',
    'nav.general': 'Extract Documents',
    'nav.templates': 'Document Types',
    'nav.history': 'Your Documents',
    'nav.settings': 'Preferences',
    'nav.logout': 'Sign Out',

    // Hero Section
    'hero.accuracy_badge': '99.2% Extraction Accuracy',
    'hero.headline': 'Transform Documents into Actionable Data',
    'hero.subheadline': 'Enterprise-grade AI extracts data from Thai & English documents with unmatched precision. Process invoices, contracts, and bank statements in seconds.',
    'hero.cta_primary': 'Start Free Trial',
    'hero.cta_secondary': 'Watch Demo',
    'hero.trust_encryption': 'Bank-grade encryption',
    'hero.trust_pdpa': 'PDPA compliant',
    'hero.trust_soc2': 'SOC 2 certified',

    // Logo Strip
    'logos.title': 'Trusted by leading Thai enterprises',

    // Stats Section
    'stats.accuracy': 'Extraction Accuracy',
    'stats.pages': 'Pages Processed',
    'stats.enterprises': 'Enterprise Clients',
    'stats.support': 'Support Available',

    // Features Section
    'features.eyebrow': 'Capabilities',
    'features.title': 'Everything You Need for Document Intelligence',
    'features.subtitle': 'From simple invoices to complex contracts, our AI handles it all with enterprise-grade accuracy.',
    'features.ai_title': 'AI-Powered Extraction',
    'features.ai_desc': 'Advanced machine learning models trained on millions of Thai and English documents for unparalleled accuracy.',
    'features.bilingual_title': 'Bilingual Processing',
    'features.bilingual_desc': 'Native support for Thai and English documents, including mixed-language content and Thai numerals.',
    'features.templates_title': 'Smart Templates',
    'features.templates_desc': 'Pre-built templates for invoices, bank statements, contracts, and purchase orders. Create custom ones in minutes.',
    'features.export_title': 'Flexible Export',
    'features.export_desc': 'Export to Excel, CSV, JSON, or integrate directly with your ERP, accounting, or analytics systems.',
    'features.batch_title': 'Batch Processing',
    'features.batch_desc': 'Process hundreds of documents simultaneously. Queue uploads and let our system handle the rest.',
    'features.api_title': 'Developer API',
    'features.api_desc': 'RESTful API with comprehensive documentation. Integrate document extraction into your workflows.',

    // Demo Section
    'demo.section_title': 'See the Magic in Action',
    'demo.section_subtitle': 'Click any document type below to see instant AI-powered extraction',
    'demo.tab_invoice': 'Invoice',
    'demo.tab_bank': 'Bank Statement',
    'demo.tab_contract': 'Contract',
    'demo.tab_po': 'Purchase Order',
    'demo.drop_title': 'Drop your document here',
    'demo.drop_subtitle': 'Or click any template above to see a live demo',
    'demo.processing_title': 'AI is extracting your data...',
    'demo.processing_subtitle': 'This usually takes just a few seconds',
    'demo.extraction_complete': 'Extraction complete',
    'demo.accuracy': 'accuracy',
    'demo.try_another': 'Try another document',

    // Comparison Section
    'comparison.title': 'The Old Way vs. The Smart Way',
    'comparison.subtitle': 'Stop wasting hours on manual data entry. Let AI do the heavy lifting.',
    'comparison.before_title': 'Manual Processing',
    'comparison.after_title': 'With Our Platform',
    'comparison.before_1': 'Hours of manual data entry per document',
    'comparison.before_2': 'High error rates from human fatigue',
    'comparison.before_3': 'Inconsistent formatting across teams',
    'comparison.before_4': 'Delayed processing and bottlenecks',
    'comparison.after_1': 'Instant extraction in seconds',
    'comparison.after_2': '99.2% accuracy, every time',
    'comparison.after_3': 'Standardized output formats',
    'comparison.after_4': 'Process documents 24/7',

    // Testimonials Section
    'testimonials.title': 'Trusted by Industry Leaders',
    'testimonials.subtitle': 'See how businesses across Thailand are transforming their document workflows',
    'testimonials.quote_1': 'This platform reduced our invoice processing time by 85%. What used to take our team hours now happens in minutes. The accuracy on Thai documents is remarkable.',
    'testimonials.author_1': 'Somchai Prasert',
    'testimonials.title_1': 'CFO',
    'testimonials.company_1': 'Bangkok Manufacturing Co.',
    'testimonials.quote_2': 'We process thousands of bank statements monthly. The bilingual support and batch processing capabilities have been game-changers for our operations.',
    'testimonials.author_2': 'Natthida Wong',
    'testimonials.title_2': 'Operations Director',
    'testimonials.company_2': 'Siam Financial Services',
    'testimonials.quote_3': 'The API integration was seamless. Our developers had it running in production within a week. Customer support has been exceptional throughout.',
    'testimonials.author_3': 'Pattaraporn Chen',
    'testimonials.title_3': 'CTO',
    'testimonials.company_3': 'Digital Solutions Thailand',

    // Security Section
    'security.title': 'Enterprise-Grade Security',
    'security.subtitle': 'Your documents are protected by the same security standards used by leading financial institutions',
    'security.encryption_title': 'AES-256 Encryption',
    'security.encryption_desc': 'All documents are encrypted at rest and in transit using bank-grade AES-256 encryption.',
    'security.pdpa_title': 'PDPA Compliant',
    'security.pdpa_desc': 'Fully compliant with Thailand Personal Data Protection Act. Your data stays in your control.',
    'security.autodelete_title': 'Auto-Delete',
    'security.autodelete_desc': 'Documents are automatically deleted after processing. Choose retention periods that fit your policy.',

    // Pricing Section
    'pricing.title': 'Simple, Transparent Pricing',
    'pricing.subtitle': 'Start free, scale as you grow. No hidden fees, no surprises.',
    'pricing.starter_name': 'Starter',
    'pricing.starter_desc': 'Perfect for trying out the platform',
    'pricing.starter_feature_1': '100 pages per month',
    'pricing.starter_feature_2': 'All document types',
    'pricing.starter_feature_3': 'Excel & CSV export',
    'pricing.starter_feature_4': 'Email support',
    'pricing.starter_cta': 'Get Started Free',
    'pricing.business_name': 'Business',
    'pricing.business_desc': 'For teams processing at scale',
    'pricing.business_feature_1': '5,000 pages per month',
    'pricing.business_feature_2': 'Priority processing',
    'pricing.business_feature_3': 'API access',
    'pricing.business_feature_4': 'Custom templates',
    'pricing.business_feature_5': 'Dedicated support',
    'pricing.business_cta': 'Start Free Trial',
    'pricing.per_month': 'month',
    'pricing.popular_badge': 'Most Popular',
    'pricing.guarantee': '14-day free trial. Cancel anytime.',

    // CTA Section
    'cta.title': 'Ready to Transform Your Document Workflow?',
    'cta.subtitle': 'Join hundreds of Thai enterprises already saving time and reducing errors with AI-powered extraction.',
    'cta.button': 'Start Your Free Trial',
    'cta.fine_print': 'No credit card required. 100 pages free every month.',

    // Auth
    'auth.welcome': 'Welcome Back',
    'auth.login_subtitle': 'Sign in to your account to continue',
    'auth.continue_line': 'Continue with LINE',
    'auth.continue_google': 'Continue with Google',
    'auth.continue_facebook': 'Continue with Facebook',
    'auth.continue_apple': 'Continue with Apple',

    // Dashboard
    'dash.welcome': 'Welcome back!',
    'dash.quick_start': 'New Extraction',
    'dash.recent': 'Pick up where you left off',
    'dash.template_bank': 'Bank Statement',
    'dash.template_invoice': 'Invoice',
    'dash.template_po': 'Purchase Order',
    'dash.template_contract': 'Contract',
    'dash.general_desc': "Any document, any format - we'll figure it out",

    // Extraction
    'extract.upload_title': 'Drop your document here',
    'extract.upload_desc': 'PDF, JPG, or PNG - we handle them all',
    'extract.processing': 'Extracting...',
    'extract.processing_sub': 'This usually takes just a few seconds',
    'extract.results': "Here's what we found",
    'extract.confidence': 'Confidence',
    'extract.export': 'Export',
    'extract.field': 'Field',
    'extract.value': 'Value',
    'extract.success': 'All done! Your data is ready',

    // Empty states
    'empty.no_history': 'No documents yet',
    'empty.no_history_desc': "Upload your first document and we'll remember it here",
    'empty.get_started': "Let's extract something",

    // Common
    'common.upgrade': 'Upgrade Plan',
    'common.usage': 'Monthly Usage',
  },
  th: {
    // Navigation
    'nav.home': 'หน้าแรก',
    'nav.pricing': 'ราคา',
    'nav.about': 'เกี่ยวกับเรา',
    'nav.signin': 'เข้าสู่ระบบ',
    'nav.dashboard': 'แดชบอร์ด',
    'nav.general': 'ดึงข้อมูลเอกสาร',
    'nav.templates': 'ประเภทเอกสาร',
    'nav.history': 'เอกสารของคุณ',
    'nav.settings': 'ตั้งค่า',
    'nav.logout': 'ออกจากระบบ',

    // Hero Section
    'hero.accuracy_badge': 'ความแม่นยำในการดึงข้อมูล 99.2%',
    'hero.headline': 'เปลี่ยนเอกสารเป็นข้อมูลที่ใช้งานได้',
    'hero.subheadline': 'AI ระดับองค์กรดึงข้อมูลจากเอกสารภาษาไทยและอังกฤษด้วยความแม่นยำสูงสุด ประมวลผลใบแจ้งหนี้ สัญญา และรายการเดินบัญชีในไม่กี่วินาที',
    'hero.cta_primary': 'เริ่มทดลองใช้ฟรี',
    'hero.cta_secondary': 'ดูตัวอย่าง',
    'hero.trust_encryption': 'เข้ารหัสระดับธนาคาร',
    'hero.trust_pdpa': 'สอดคล้อง PDPA',
    'hero.trust_soc2': 'ได้รับ SOC 2',

    // Logo Strip
    'logos.title': 'ได้รับความไว้วางใจจากองค์กรชั้นนำในไทย',

    // Stats Section
    'stats.accuracy': 'ความแม่นยำ',
    'stats.pages': 'หน้าที่ประมวลผลแล้ว',
    'stats.enterprises': 'ลูกค้าองค์กร',
    'stats.support': 'พร้อมให้บริการ',

    // Features Section
    'features.eyebrow': 'ความสามารถ',
    'features.title': 'ทุกสิ่งที่คุณต้องการสำหรับ Document Intelligence',
    'features.subtitle': 'ตั้งแต่ใบแจ้งหนี้ธรรมดาไปจนถึงสัญญาที่ซับซ้อน AI ของเราจัดการได้ทั้งหมดด้วยความแม่นยำระดับองค์กร',
    'features.ai_title': 'AI ดึงข้อมูลอัตโนมัติ',
    'features.ai_desc': 'โมเดล Machine Learning ขั้นสูงที่ฝึกจากเอกสารภาษาไทยและอังกฤษนับล้านฉบับเพื่อความแม่นยำสูงสุด',
    'features.bilingual_title': 'รองรับสองภาษา',
    'features.bilingual_desc': 'รองรับเอกสารภาษาไทยและอังกฤษ รวมถึงเนื้อหาหลายภาษาและเลขไทย',
    'features.templates_title': 'เทมเพลตอัจฉริยะ',
    'features.templates_desc': 'เทมเพลตสำเร็จรูปสำหรับใบแจ้งหนี้ รายการเดินบัญชี สัญญา และใบสั่งซื้อ สร้างแบบกำหนดเองได้ในไม่กี่นาที',
    'features.export_title': 'ส่งออกยืดหยุ่น',
    'features.export_desc': 'ส่งออกเป็น Excel, CSV, JSON หรือเชื่อมต่อโดยตรงกับระบบ ERP, บัญชี หรือระบบวิเคราะห์ของคุณ',
    'features.batch_title': 'ประมวลผลเป็นชุด',
    'features.batch_desc': 'ประมวลผลเอกสารหลายร้อยฉบับพร้อมกัน จัดคิวอัปโหลดและปล่อยให้ระบบจัดการ',
    'features.api_title': 'API สำหรับนักพัฒนา',
    'features.api_desc': 'RESTful API พร้อมเอกสารประกอบครบถ้วน เชื่อมต่อการดึงข้อมูลเอกสารเข้ากับ workflow ของคุณ',

    // Demo Section
    'demo.section_title': 'ดูความมหัศจรรย์ของ AI',
    'demo.section_subtitle': 'คลิกประเภทเอกสารด้านล่างเพื่อดูการดึงข้อมูลอัตโนมัติทันที',
    'demo.tab_invoice': 'ใบแจ้งหนี้',
    'demo.tab_bank': 'รายการเดินบัญชี',
    'demo.tab_contract': 'สัญญา',
    'demo.tab_po': 'ใบสั่งซื้อ',
    'demo.drop_title': 'วางเอกสารของคุณที่นี่',
    'demo.drop_subtitle': 'หรือคลิกเทมเพลตด้านบนเพื่อดูตัวอย่าง',
    'demo.processing_title': 'AI กำลังดึงข้อมูลของคุณ...',
    'demo.processing_subtitle': 'ปกติใช้เวลาไม่กี่วินาที',
    'demo.extraction_complete': 'ดึงข้อมูลเสร็จสิ้น',
    'demo.accuracy': 'ความแม่นยำ',
    'demo.try_another': 'ลองเอกสารอื่น',

    // Comparison Section
    'comparison.title': 'วิธีเดิม vs. วิธีอัจฉริยะ',
    'comparison.subtitle': 'หยุดเสียเวลากับการกรอกข้อมูลด้วยมือ ให้ AI ทำงานหนักแทนคุณ',
    'comparison.before_title': 'ประมวลผลด้วยมือ',
    'comparison.after_title': 'ด้วยแพลตฟอร์มของเรา',
    'comparison.before_1': 'ใช้เวลาหลายชั่วโมงกรอกข้อมูลต่อเอกสาร',
    'comparison.before_2': 'ข้อผิดพลาดสูงจากความเหนื่อยล้า',
    'comparison.before_3': 'รูปแบบไม่สอดคล้องกันระหว่างทีม',
    'comparison.before_4': 'การประมวลผลล่าช้าและเกิดคอขวด',
    'comparison.after_1': 'ดึงข้อมูลทันทีในไม่กี่วินาที',
    'comparison.after_2': 'ความแม่นยำ 99.2% ทุกครั้ง',
    'comparison.after_3': 'รูปแบบผลลัพธ์ที่เป็นมาตรฐาน',
    'comparison.after_4': 'ประมวลผลเอกสารได้ 24/7',

    // Testimonials Section
    'testimonials.title': 'ได้รับความไว้วางใจจากผู้นำอุตสาหกรรม',
    'testimonials.subtitle': 'ดูว่าธุรกิจทั่วประเทศไทยกำลังเปลี่ยนแปลง workflow เอกสารอย่างไร',
    'testimonials.quote_1': 'แพลตฟอร์มนี้ลดเวลาประมวลผลใบแจ้งหนี้ของเราลง 85% สิ่งที่เคยใช้เวลาหลายชั่วโมงตอนนี้ใช้เวลาเพียงไม่กี่นาที ความแม่นยำกับเอกสารภาษาไทยน่าทึ่งมาก',
    'testimonials.author_1': 'สมชาย ประเสริฐ',
    'testimonials.title_1': 'CFO',
    'testimonials.company_1': 'Bangkok Manufacturing Co.',
    'testimonials.quote_2': 'เราประมวลผลรายการเดินบัญชีหลายพันรายการต่อเดือน การรองรับสองภาษาและความสามารถในการประมวลผลเป็นชุดเปลี่ยนแปลงการทำงานของเราอย่างมาก',
    'testimonials.author_2': 'ณัฐธิดา หว่อง',
    'testimonials.title_2': 'ผู้อำนวยการฝ่ายปฏิบัติการ',
    'testimonials.company_2': 'Siam Financial Services',
    'testimonials.quote_3': 'การเชื่อมต่อ API ราบรื่นมาก นักพัฒนาของเราใช้งานในระบบจริงได้ภายในหนึ่งสัปดาห์ ทีมสนับสนุนลูกค้ายอดเยี่ยมตลอดการใช้งาน',
    'testimonials.author_3': 'ภัทราภรณ์ เฉิน',
    'testimonials.title_3': 'CTO',
    'testimonials.company_3': 'Digital Solutions Thailand',

    // Security Section
    'security.title': 'ความปลอดภัยระดับองค์กร',
    'security.subtitle': 'เอกสารของคุณได้รับการปกป้องด้วยมาตรฐานความปลอดภัยเดียวกับสถาบันการเงินชั้นนำ',
    'security.encryption_title': 'เข้ารหัส AES-256',
    'security.encryption_desc': 'เอกสารทั้งหมดถูกเข้ารหัสทั้งขณะจัดเก็บและส่งข้อมูลด้วยการเข้ารหัส AES-256 ระดับธนาคาร',
    'security.pdpa_title': 'สอดคล้อง PDPA',
    'security.pdpa_desc': 'ปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคลอย่างครบถ้วน ข้อมูลของคุณอยู่ในการควบคุมของคุณ',
    'security.autodelete_title': 'ลบอัตโนมัติ',
    'security.autodelete_desc': 'เอกสารถูกลบโดยอัตโนมัติหลังประมวลผล เลือกระยะเวลาเก็บรักษาที่เหมาะกับนโยบายของคุณ',

    // Pricing Section
    'pricing.title': 'ราคาที่เรียบง่าย โปร่งใส',
    'pricing.subtitle': 'เริ่มต้นฟรี ขยายตามการเติบโต ไม่มีค่าใช้จ่ายแอบแฝง',
    'pricing.starter_name': 'Starter',
    'pricing.starter_desc': 'เหมาะสำหรับทดลองใช้แพลตฟอร์ม',
    'pricing.starter_feature_1': '100 หน้าต่อเดือน',
    'pricing.starter_feature_2': 'เอกสารทุกประเภท',
    'pricing.starter_feature_3': 'ส่งออก Excel และ CSV',
    'pricing.starter_feature_4': 'สนับสนุนทางอีเมล',
    'pricing.starter_cta': 'เริ่มต้นใช้งานฟรี',
    'pricing.business_name': 'Business',
    'pricing.business_desc': 'สำหรับทีมที่ประมวลผลจำนวนมาก',
    'pricing.business_feature_1': '5,000 หน้าต่อเดือน',
    'pricing.business_feature_2': 'ประมวลผลลำดับความสำคัญ',
    'pricing.business_feature_3': 'เข้าถึง API',
    'pricing.business_feature_4': 'เทมเพลตกำหนดเอง',
    'pricing.business_feature_5': 'สนับสนุนเฉพาะทาง',
    'pricing.business_cta': 'เริ่มทดลองใช้ฟรี',
    'pricing.per_month': 'เดือน',
    'pricing.popular_badge': 'ยอดนิยม',
    'pricing.guarantee': 'ทดลองใช้ฟรี 14 วัน ยกเลิกได้ทุกเมื่อ',

    // CTA Section
    'cta.title': 'พร้อมเปลี่ยนแปลง Workflow เอกสารของคุณ?',
    'cta.subtitle': 'เข้าร่วมองค์กรไทยหลายร้อยแห่งที่ประหยัดเวลาและลดข้อผิดพลาดด้วยการดึงข้อมูลด้วย AI',
    'cta.button': 'เริ่มทดลองใช้ฟรี',
    'cta.fine_print': 'ไม่ต้องใช้บัตรเครดิต ฟรี 100 หน้าทุกเดือน',

    // Auth
    'auth.welcome': 'ยินดีต้อนรับกลับ',
    'auth.login_subtitle': 'ลงชื่อเข้าใช้บัญชีของคุณเพื่อดำเนินการต่อ',
    'auth.continue_line': 'ดำเนินการต่อด้วย LINE',
    'auth.continue_google': 'ดำเนินการต่อด้วย Google',
    'auth.continue_facebook': 'ดำเนินการต่อด้วย Facebook',
    'auth.continue_apple': 'ดำเนินการต่อด้วย Apple',

    // Dashboard
    'dash.welcome': 'ยินดีต้อนรับกลับมา!',
    'dash.quick_start': 'ดึงข้อมูลใหม่',
    'dash.recent': 'ทำงานต่อจากที่ค้างไว้',
    'dash.template_bank': 'รายการเดินบัญชี',
    'dash.template_invoice': 'ใบแจ้งหนี้',
    'dash.template_po': 'ใบสั่งซื้อ',
    'dash.template_contract': 'สัญญา',
    'dash.general_desc': 'เอกสารอะไรก็ได้ รูปแบบไหนก็ได้ เราจัดการให้',

    // Extraction
    'extract.upload_title': 'วางเอกสารของคุณที่นี่',
    'extract.upload_desc': 'PDF, JPG หรือ PNG - เราจัดการได้ทั้งหมด',
    'extract.processing': 'กำลังดึงข้อมูล...',
    'extract.processing_sub': 'ปกติใช้เวลาไม่กี่วินาที',
    'extract.results': 'นี่คือข้อมูลที่เราพบ',
    'extract.confidence': 'ความเชื่อมั่น',
    'extract.export': 'ส่งออก',
    'extract.field': 'ฟิลด์',
    'extract.value': 'ค่า',
    'extract.success': 'เสร็จแล้ว! ข้อมูลพร้อมใช้งาน',

    // Empty states
    'empty.no_history': 'ยังไม่มีเอกสาร',
    'empty.no_history_desc': 'อัปโหลดเอกสารแรกของคุณ แล้วเราจะจดจำไว้ที่นี่',
    'empty.get_started': 'เริ่มดึงข้อมูลกันเถอะ',

    // Common
    'common.upgrade': 'อัปเกรดแผน',
    'common.usage': 'การใช้งานเดือนนี้',
  }
};

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const useLanguage = create<LanguageState>((set, get) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),
  t: (key) => {
    const lang = get().language;
    return translations[lang][key] || key;
  }
}));
