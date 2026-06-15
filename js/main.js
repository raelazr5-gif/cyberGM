import {
  escapeHtml,
  safeJsonParse,
  normalizeAgentName,
  isValidAgentName,
  storageKeyForPlayer,
  mapThreatType,
  csvEscape,
  pickAvaResponse,
} from './utils.js';
import {
  checkServerHealth,
  fetchPlayerFromServer,
  savePlayerToServer,
  fetchLeaderboardFromServer,
  getApiBase,
} from './api.js';
import {
  createBattleState,
  getBattleSkills,
  applyBattleMove,
  applyBattleSkill,
  enemyAction as battleEnemyAction,
  initDuelArena,
} from './battleSystem.js';
import { initWorldMap, destroyWorldMap } from './worldMap.js';

let clockInterval = null;


/* ════════════════════════════════════
   GAME STATE
════════════════════════════════════ */
const G = {
  player: null,
  currentMission: null,
  currentCaseIndex: 0,
  caseStartTime: 0,
  gameScore: 0,
  sessionData: [],
  timerInterval: null,
  timeLeft: 30,
  selectedAvatar: '🕵️',
  selectedAvatar2: '🕵️',
  avaContext: [],
  gpSidebarTab: 'tab-ava',
  serverOnline: false,
};

const RANKS = [
  {min:0,   name:'Rookie Investigator',    color:'#6a8fa8'},
  {min:200, name:'Cyber Analyst',          color:'#00c4bc'},
  {min:500, name:'Security Specialist',    color:'#2ab54b'},
  {min:900, name:'Senior Investigator',    color:'#aa44ff'},
  {min:1400,name:'Threat Hunter',          color:'#ffe566'},
  {min:2000,name:'Elite Cyber Agent',      color:'#ff9933'},
  {min:3000,name:'Master of Cybersecurity',color:'#ff3366'},
];

/* ════════════════════════════════════
   MISSIONS DATABASE
════════════════════════════════════ */
const MISSIONS_DB = [
  {
    id:'m1', type:'phishing', name:'EMAIL TRAP #1', icon:'📧',
    desc:'Analisis 3 email masuk. Tentukan mana phishing, mana legitimate.',
    difficulty:'EASY', reward:100, xp:50, tags:['phish'],
    cases: [
      {
        id:'c1', type:'phishing',
        title:'Email Hadiah Bank BRI',
        subtitle:'Analisis header dan konten email mencurigakan',
        artifact:{
          type:'email',
          from:'promo@bankbri-promo.info',
          fromSafe:false,
          to:'nasabah@email.com',
          subject:'🎉 Selamat! Rekening Anda Terpilih Mendapat Hadiah Rp 50 Juta',
          body:`Yth. Nasabah BRI Setia,

Kami dengan bangga mengumumkan bahwa rekening Anda <span class="highlight-sus" data-tip="Klaim palsu tanpa dasar hukum jelas">terpilih sebagai pemenang</span> program loyalitas BRI 2026.

Hadiah senilai <span class="highlight-sus" data-tip="Nominal besar untuk memancing keserakahan — taktik umum phishing">Rp 50.000.000</span> siap dicairkan.

Klik link berikut untuk verifikasi:
<span class="highlight-sus" data-tip="Domain palsu! BRI asli: bri.co.id bukan bankbri-promo.info"><a href="#" onclick="return false;" style="color:var(--orange);">http://bankbri-promo.info/klaim-hadiah?id=BRI99821</a></span>

Siapkan: KTP, No. Rekening, PIN ATM, dan OTP.

<span class="highlight-sus" data-tip="Tenggat waktu palsu — teknik pressure tactics untuk memaksa keputusan cepat">Batas waktu: 24 JAM dari email ini dikirim.</span>

Hormat kami,
Tim Hadiah BRI`,
        },
        indicators:[
          {icon:'🌐',label:'Domain pengirim: bankbri-promo.info',status:'DANGER',class:'ind-danger'},
          {icon:'🔗',label:'Link mengarah ke domain non-resmi',status:'DANGER',class:'ind-danger'},
          {icon:'🔑',label:'Meminta PIN ATM & OTP via email',status:'DANGER',class:'ind-danger'},
          {icon:'⏱️',label:'Deadline 24 jam (pressure tactics)',status:'WARN',class:'ind-warn'},
          {icon:'💰',label:'Klaim hadiah tidak realistis',status:'WARN',class:'ind-warn'},
        ],
        riskScore: 95,
        isPhishing: true,
        correctVerdict: 'threat',
        education:[
          'Bank resmi (BRI, BCA, Mandiri) TIDAK PERNAH meminta PIN ATM atau OTP via email.',
          'Domain resmi BRI adalah bri.co.id — domain "bankbri-promo.info" adalah palsu.',
          'Teknik "pressure tactics" (batas 24 jam) digunakan untuk mencegah korban berpikir jernih.',
          'Permintaan data sensitif (KTP, PIN, OTP) via email adalah tanda phishing klasik.',
          'Selalu verifikasi langsung ke call center resmi bank jika menerima email semacam ini.',
        ],
        phishIndicators:['Domain spoofing','Pressure tactics','Data harvesting','Prize scam'],
        avaHints:['Periksa domain pengirim dengan teliti.','Bank tidak pernah minta PIN via email.','Waspadai urgensi buatan.'],
        clues:[
          {text:'Domain pengirim tidak sama dengan situs resmi BRI'},
          {text:'Email meminta data sensitif (PIN, OTP)'},
          {text:'Klaim hadiah tanpa mekanisme undian yang jelas'},
        ],
        adaptiveHint:'Kamu sering terkecoh pressure tactics. Fokus pada domain pengirim dulu sebelum membaca isi.',
      },
      {
        id:'c2', type:'phishing',
        title:'Notifikasi Pengiriman JNE',
        subtitle:'Verifikasi apakah notifikasi pengiriman ini legitimate',
        artifact:{
          type:'email',
          from:'no-reply@jne.co.id',
          fromSafe:true,
          to:'pelanggan@email.com',
          subject:'Paket Anda Sedang Dalam Pengiriman — Resi JX-9921038',
          body:`Halo Pelanggan,

Paket Anda dengan nomor resi <span class="highlight-safe">JX-9921038</span> telah dikirim dari gudang kami.

Detail pengiriman:
- Pengirim: Toko Elektronik Murah Official
- Tujuan: Jakarta Selatan
- Estimasi tiba: 2-3 hari kerja

<span class="highlight-safe">Lacak paket: https://www.jne.co.id/id/tracking/trace</span>

Hubungi kami di 021-2927-8888 jika ada pertanyaan.

Terima kasih menggunakan JNE Express.
— Customer Service JNE`,
        },
        indicators:[
          {icon:'🌐',label:'Domain: jne.co.id (domain resmi terverifikasi)',status:'SAFE',class:'ind-safe'},
          {icon:'🔗',label:'Link lacak mengarah ke domain resmi JNE',status:'SAFE',class:'ind-safe'},
          {icon:'📞',label:'Nomor telepon resmi tercantum',status:'SAFE',class:'ind-safe'},
          {icon:'🔑',label:'Tidak ada permintaan data sensitif',status:'SAFE',class:'ind-safe'},
          {icon:'⏱️',label:'Tidak ada tekanan waktu berlebihan',status:'SAFE',class:'ind-safe'},
        ],
        riskScore: 8,
        isPhishing: false,
        correctVerdict: 'safe',
        education:[
          'Domain jne.co.id adalah domain resmi PT Tiki Jalur Nugraha Ekakurir yang terverifikasi.',
          'Email legitimate tidak meminta PIN, password, atau data sensitif apapun.',
          'Link yang digunakan mengarah ke subdomain resmi yang sama (jne.co.id).',
          'Notifikasi pengiriman yang sah selalu menyertakan nomor resi yang dapat diverifikasi.',
          'Tidak adanya "pressure tactics" atau klaim hadiah adalah tanda email yang legitimate.',
        ],
        phishIndicators:['Domain: AMAN','Link: AMAN','Data request: NONE','Pressure: NONE'],
        avaHints:['Periksa domain—jne.co.id adalah resmi.','Tidak ada data sensitif diminta.','Link mengarah ke situs resmi.'],
        clues:[
          {text:'Domain pengirim adalah domain resmi JNE'},
          {text:'Tidak meminta data sensitif apapun'},
          {text:'Link mengarah ke situs resmi yang sama'},
        ],
        adaptiveHint:'Pola email ini aman. Ingat ciri khas email legitimate: domain resmi, tidak minta data sensitif.',
      },
      {
        id:'c3', type:'phishing',
        title:'Verifikasi Akun Tokopedia',
        subtitle:'Email dari Tokopedia — legitimate atau spoofing?',
        artifact:{
          type:'email',
          from:'noreply@tokopedia-verify.com',
          fromSafe:false,
          to:'user@email.com',
          subject:'[URGENT] Verifikasi Akun Tokopedia Anda Sebelum Dinonaktifkan',
          body:`Yth. Pengguna Tokopedia,

Sistem kami mendeteksi <span class="highlight-sus" data-tip="Klaim palsu — digunakan untuk menakut-nakuti korban">aktivitas tidak biasa</span> pada akun Anda.

Untuk mencegah penonaktifan akun, <span class="highlight-sus" data-tip="Domain palsu! Tokopedia resmi: tokopedia.com">verifikasi di sini: http://tokopedia-verify.com/akun/verifikasi</span>

Masukkan:
• Email & Password
• Nomor HP
• Kode OTP yang akan dikirim

<span class="highlight-sus" data-tip="Teknik scarcity — memaksa tindakan segera tanpa berpikir">Akun akan dinonaktifkan dalam 2 JAM jika tidak diverifikasi.</span>

Tim Keamanan Tokopedia`,
        },
        indicators:[
          {icon:'🌐',label:'Domain: tokopedia-verify.com (BUKAN tokopedia.com)',status:'DANGER',class:'ind-danger'},
          {icon:'🔐',label:'Meminta password & OTP via link',status:'DANGER',class:'ind-danger'},
          {icon:'⚠️',label:'Ancaman penonaktifan akun palsu',status:'DANGER',class:'ind-danger'},
          {icon:'⏱️',label:'Deadline 2 jam (extreme pressure)',status:'WARN',class:'ind-warn'},
        ],
        riskScore: 92,
        isPhishing: true,
        correctVerdict: 'threat',
        education:[
          'Domain asli Tokopedia adalah tokopedia.com — "tokopedia-verify.com" adalah domain typosquatting.',
          'Tokopedia tidak pernah meminta password via email — login hanya di app/website resmi.',
          'Ancaman "akun dinonaktifkan dalam 2 jam" adalah teknik social engineering classic.',
          'OTP hanya boleh dimasukkan di halaman resmi aplikasi — jangan di link dari email.',
          'Lapor email mencurigakan ke support@tokopedia.com jika menerimanya.',
        ],
        phishIndicators:['Typosquatting domain','Account threat scam','Credential harvesting','Time pressure'],
        avaHints:['tokopedia-verify.com ≠ tokopedia.com','Jangan masukkan password di link email.','2 jam deadline = red flag besar.'],
        clues:[
          {text:'Domain menggunakan variasi nama (typosquatting)'},
          {text:'Meminta password dan OTP via link email'},
          {text:'Ancaman penonaktifan akun palsu dalam waktu sangat singkat'},
        ],
        adaptiveHint:'Typosquatting adalah taktik umum. Selalu ketik URL langsung di browser daripada klik link email.',
      }
    ]
  },
  {
    id:'m2', type:'social', name:'SOCIAL ENGINEERING CASE', icon:'🎭',
    desc:'Identifikasi manipulasi psikologis: pretexting, impersonasi, dan teknik rekayasa sosial lainnya.',
    difficulty:'EASY', reward:120, xp:60, tags:['social'],
    cases:[
      {
        id:'c4', type:'social',
        title:'Telepon IT Support Palsu',
        subtitle:'Pesan WhatsApp dari "IT Support" perusahaan',
        artifact:{
          type:'chat',
          sender:'IT Support Company (0812-XXXX)',
          body:`💬 CHAT WHATSAPP

IT SUPPORT: Selamat siang, saya Budi dari IT Support perusahaan. Kami mendeteksi bahwa laptop Anda perlu update keamanan darurat hari ini.

IT SUPPORT: Untuk melakukan update, kami butuh Anda install software ini dari link berikut:
http://bit.ly/3xSecureUpdate

IT SUPPORT: Setelah install, tolong berikan kode 6 digit yang muncul di layar anda kepada kami.

IT SUPPORT: Ini URGENT. Jika tidak dilakukan hari ini, laptop Anda akan terblokir dari jaringan kantor.

ANDA: Boleh saya verifikasi identitas Bapak dulu?

IT SUPPORT: Tidak perlu, ini sudah darurat. Waktu sangat terbatas. Segera install sekarang!`,
        },
        indicators:[
          {icon:'🔗',label:'Link bit.ly menyembunyikan URL asli',status:'DANGER',class:'ind-danger'},
          {icon:'🔑',label:'Meminta kode akses (kemungkinan 2FA/remote access)',status:'DANGER',class:'ind-danger'},
          {icon:'😤',label:'Menolak diverifikasi identitasnya',status:'DANGER',class:'ind-danger'},
          {icon:'⏱️',label:'Urgensi berlebihan tanpa prosedur resmi',status:'WARN',class:'ind-warn'},
          {icon:'📱',label:'Kontak via WhatsApp (bukan jalur resmi IT)',status:'WARN',class:'ind-warn'},
        ],
        riskScore: 88,
        isPhishing: true,
        correctVerdict: 'threat',
        education:[
          'IT support legitimate tidak pernah meminta kode 2FA atau remote access code via chat.',
          'Selalu verifikasi identitas seseorang yang mengklaim dari IT support via jalur resmi.',
          'Link shortener (bit.ly) digunakan untuk menyembunyikan URL mencurigakan.',
          'Penolakan untuk diverifikasi adalah tanda kuat social engineering.',
          'Prosedur IT resmi selalu melalui tiket helpdesk atau email corporate.',
        ],
        phishIndicators:['Pretexting','Authority impersonation','Urgency manipulation','Code harvesting'],
        avaHints:['IT support resmi tidak minta kode 2FA.','Selalu verifikasi via jalur resmi.','Bit.ly menyembunyikan URL asli.'],
        clues:[
          {text:'Pelaku menolak diverifikasi identitasnya'},
          {text:'Link menggunakan URL shortener yang menyembunyikan tujuan'},
          {text:'Meminta kode yang muncul di layar (kemungkinan kode remote access)'},
        ],
        adaptiveHint:'Ingat: permintaan yang sah tidak pernah membutuhkan urgensi yang mencegah verifikasi.',
      }
    ]
  },
  {
    id:'m3', type:'web', name:'WEB THREAT ANALYSIS', icon:'🌐',
    desc:'Analisis URL dan website mencurigakan. Deteksi SSL palsu, domain typosquatting, clickjacking.',
    difficulty:'MEDIUM', reward:150, xp:75, tags:['web'],
    cases:[
      {
        id:'c5', type:'web',
        title:'Website Login BCA Palsu',
        subtitle:'User melaporkan website login bank yang mencurigakan',
        artifact:{
          type:'website',
          url:'http://www.bcaindonesia-login.com/ibank/',
          ssl:false,
          body:`🌐 PREVIEW WEBSITE

[TIDAK ADA HTTPS] http://www.bcaindonesia-login.com/ibank/

╔══════════════════════════════════╗
║  🏦 BCA INTERNET BANKING        ║
║  ──────────────────────────────  ║
║  Selamat Datang di KlikBCA      ║
║                                  ║
║  User ID: [____________]         ║
║  PIN:     [____________]         ║
║                                  ║
║  [  LOGIN  ]                     ║
║                                  ║
║  © 2026 Bank Central Asia       ║
╚══════════════════════════════════╝

Metadata:
- Domain: bcaindonesia-login.com
- IP: 185.220.101.X (Rusia)
- SSL: TIDAK ADA
- Registrar: Namecheap (baru terdaftar 3 hari lalu)
- BCA Resmi: klikbca.com`,
        },
        indicators:[
          {icon:'🔒',label:'Tidak ada HTTPS/SSL certificate',status:'DANGER',class:'ind-danger'},
          {icon:'🌐',label:'Domain: bcaindonesia-login.com (bukan klikbca.com)',status:'DANGER',class:'ind-danger'},
          {icon:'🌍',label:'IP server dari Rusia (bukan Indonesia)',status:'DANGER',class:'ind-danger'},
          {icon:'📅',label:'Domain baru terdaftar 3 hari lalu',status:'DANGER',class:'ind-danger'},
          {icon:'🔑',label:'Form login mengumpulkan User ID dan PIN',status:'DANGER',class:'ind-danger'},
        ],
        riskScore: 99,
        isPhishing: true,
        correctVerdict: 'report',
        education:[
          'Website bank resmi SELALU menggunakan HTTPS. URL BCA: klikbca.com (bukan bcaindonesia-login.com).',
          'Domain yang baru didaftarkan (3 hari) adalah indikator kuat phishing site.',
          'IP server dari negara asing untuk bank Indonesia adalah tanda merah besar.',
          'Tidak adanya SSL/TLS berarti data yang dimasukkan terkirim tanpa enkripsi.',
          'Selalu ketik URL bank langsung di browser, jangan melalui link dari email/chat.',
        ],
        phishIndicators:['No SSL/HTTPS','Domain spoofing','Foreign IP server','New domain registration','Credential phishing form'],
        avaHints:['Cek SSL dulu — bank resmi pasti HTTPS.','bcaindonesia-login.com bukan domain BCA.','IP server dari Rusia — sangat mencurigakan.'],
        clues:[
          {text:'Website tidak menggunakan HTTPS (tidak ada SSL)'},
          {text:'Domain berbeda dari situs resmi BCA (klikbca.com)'},
          {text:'Server berlokasi di luar Indonesia'},
          {text:'Domain baru didaftarkan beberapa hari lalu'},
        ],
        adaptiveHint:'Website banking palsu adalah ancaman serius. Selalu verifikasi HTTPS dan URL sebelum login ke bank.',
      }
    ]
  },
  {
    id:'m4', type:'malware', name:'FILE FORENSICS', icon:'🦠',
    desc:'Analisis file mencurigakan: ekstensi ganda, ukuran anomali, metadata, dan hash verification.',
    difficulty:'MEDIUM', reward:180, xp:90, tags:['mal'],
    cases:[
      {
        id:'c6', type:'malware',
        title:'File Lampiran Email Mencurigakan',
        subtitle:'Analisis file yang diterima via email dari pengirim tidak dikenal',
        artifact:{
          type:'file',
          filename:'Invoice_Pembayaran_April2026.pdf.exe',
          body:`📁 FILE ANALYSIS REPORT

Nama File: Invoice_Pembayaran_April2026.pdf.exe
Ukuran: 847 KB
Tipe Asli: Executable (.exe) menyamar sebagai PDF
Ikon: 📄 (ikon PDF palsu)

── METADATA ──
Compiler: AutoIT v3
Timestamp: 2026-05-18 23:47:11 (semalam)
Digital Signature: TIDAK ADA
Publisher: Unknown

── HASH ──
MD5:  a7f3c891d45e12b87654321098fedcba
SHA1: d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3
VirusTotal: 34/72 engine mendeteksi sebagai MALICIOUS

── STRINGS DITEMUKAN ──
• "keylogger_init()"
• "send_to_server(clipboard_data)"
• "disable_windows_defender()"
• "C:\\Users\\%USERNAME%\\AppData\\Roaming\\logs\\"`,
        },
        indicators:[
          {icon:'📄',label:'Ekstensi ganda: .pdf.exe (menyamar sebagai PDF)',status:'DANGER',class:'ind-danger'},
          {icon:'🔏',label:'Tidak ada digital signature yang valid',status:'DANGER',class:'ind-danger'},
          {icon:'🦠',label:'34/72 antivirus mendeteksi sebagai malware',status:'DANGER',class:'ind-danger'},
          {icon:'🔍',label:'Ditemukan string keylogger dan data harvesting',status:'DANGER',class:'ind-danger'},
          {icon:'🛡️',label:'Kode untuk menonaktifkan Windows Defender',status:'DANGER',class:'ind-danger'},
        ],
        riskScore: 100,
        isPhishing: false,
        correctVerdict: 'report',
        education:[
          'Ekstensi ganda (.pdf.exe) adalah teknik klasik untuk menyembunyikan malware sebagai file aman.',
          'Windows secara default menyembunyikan ekstensi file — aktifkan "Show file extensions" untuk keamanan.',
          'File tanpa digital signature dari publisher terkenal harus diwaspadai.',
          'Selalu cek file mencurigakan dengan VirusTotal.com sebelum membuka.',
          'Keylogger merekam setiap ketikan keyboard, termasuk password dan data kartu kredit.',
        ],
        phishIndicators:['Double extension','No signature','Keylogger detected','AV flagged 34/72','Defender disabler'],
        avaHints:['File .pdf.exe bukan PDF!','34/72 AV — sangat berbahaya.','Keylogger dapat mencuri semua password.'],
        clues:[
          {text:'File menggunakan ekstensi ganda (.pdf.exe)'},
          {text:'34 dari 72 antivirus mendeteksi sebagai malware'},
          {text:'Kode keylogger ditemukan dalam file'},
          {text:'Tidak ada digital signature yang valid'},
        ],
        adaptiveHint:'Selalu periksa ekstensi file sesungguhnya. Aktifkan "Show file extensions" di Windows Explorer.',
      }
    ]
  },
  {
    id:'m5', type:'scam', name:'FINANCIAL SCAM NETWORK', icon:'💸',
    desc:'Investigasi penipuan finansial: investasi bodong, crypto scam, romance scam.',
    difficulty:'HARD', reward:250, xp:120, tags:['scam'],
    cases:[
      {
        id:'c7', type:'scam',
        title:'Investasi Kripto Bodong',
        subtitle:'Analisis tawaran investasi yang viral di media sosial',
        artifact:{
          type:'social',
          sender:'@CryptoMasterID (1.2M followers)',
          body:`📱 INSTAGRAM POST

@CryptoMasterID ✓ (centang hijau palsu)

"🚀 KESEMPATAN INVESTASI CRYPTO TERBATAS!

💰 Invest Rp 500.000 → Dapat Rp 5.000.000 dalam 7 HARI!
Return 1000% DIJAMIN!

✅ Sudah 15.000 member sukses
✅ Licensed & Regulated (dokumen palsu terlampir)
✅ Withdraw kapan saja

Bergabung sekarang sebelum slot habis!
Link: t.me/CryptoMasterInvest

⚠️ HANYA 50 SLOT TERSISA — HARI INI SAJA!"

[KOMENTAR]
@user1: Saya sudah withdraw Rp 8 juta! 🔥
@user2: Recommended banget! 
@user3: Slot saya sudah masuk, makasih min!
(Komentar terlihat bot-generated)`,
        },
        indicators:[
          {icon:'💰',label:'Return 1000% dalam 7 hari — tidak realistis',status:'DANGER',class:'ind-danger'},
          {icon:'🎭',label:'Testimoni dan komentar terlihat dari bot',status:'DANGER',class:'ind-danger'},
          {icon:'📜',label:'Klaim licensed tapi dokumen palsu',status:'DANGER',class:'ind-danger'},
          {icon:'⏱️',label:'"50 slot tersisa" — false scarcity tactic',status:'WARN',class:'ind-warn'},
          {icon:'📱',label:'Transaksi via Telegram (tidak terregulasi)',status:'WARN',class:'ind-warn'},
        ],
        riskScore: 97,
        isPhishing: true,
        correctVerdict: 'report',
        education:[
          'Investasi legitimate TIDAK PERNAH menjanjikan return tetap 1000% — ini skema Ponzi.',
          'Centang verifikasi palsu mudah dibuat di platform tertentu untuk meniru akun resmi.',
          'OJK mengatur investasi di Indonesia — cek legalitas di ojk.go.id sebelum berinvestasi.',
          'Testimoni yang terlihat bot-generated adalah tanda scam — periksa profil komentator.',
          '"Slot terbatas" dan deadline palsu adalah teknik FOMO (Fear Of Missing Out) manipulation.',
        ],
        phishIndicators:['Ponzi scheme','Fake verification','FOMO manipulation','Bot testimonials','Unregulated platform'],
        avaHints:['1000% return dalam 7 hari = mustahil dan ilegal.','Cek OJK: ojk.go.id untuk investasi legal.','Komentar bot-generated adalah red flag besar.'],
        clues:[
          {text:'Return 1000% dalam 7 hari adalah tidak realistis'},
          {text:'Komentar positif terlihat dari akun bot'},
          {text:'Transaksi diminta via Telegram (tidak terregulasi OJK)'},
          {text:'Dokumen lisensi palsu terlampir'},
        ],
        adaptiveHint:'Aturan emas: jika terdengar terlalu bagus untuk menjadi kenyataan, itu pasti scam.',
      }
    ]
  }
];

/* ════════════════════════════════════
   SKILL TREE DATA
════════════════════════════════════ */
const SKILLS = {
  analyst:[
    {id:'a1',name:'Sharp Eye',desc:'+10% akurasi deteksi domain palsu',cost:1,requires:null},
    {id:'a2',name:'Pattern Recognition',desc:'Tampilkan 1 indikator tersembunyi gratis',cost:2,requires:'a1'},
    {id:'a3',name:'Expert Analysis',desc:'Risk meter lebih akurat +15%',cost:3,requires:'a2'},
  ],
  detective:[
    {id:'d1',name:'Investigation Instinct',desc:'Dapatkan 1 clue gratis per misi',cost:1,requires:null},
    {id:'d2',name:'Deep Dive',desc:'AVA memberikan hint lebih detail',cost:2,requires:'d1'},
    {id:'d3',name:'Master Detective',desc:'Waktu investigasi +15 detik per kasus',cost:3,requires:'d2'},
  ],
  hacker:[
    {id:'h1',name:'Speed Hack',desc:'Bonus poin +20% untuk jawaban cepat',cost:1,requires:null},
    {id:'h2',name:'Zero-Day Sense',desc:'Deteksi otomatis 1 red flag per kasus',cost:2,requires:'h1'},
    {id:'h3',name:'Black Hat Counter',desc:'Skor tidak dikurangi untuk 1 kesalahan',cost:3,requires:'h2'},
  ],
};

/* ════════════════════════════════════
   SHOP ITEMS DATA
════════════════════════════════════ */
const SHOP_ITEMS = [
  {id:'s1',name:'Domain Analyzer',icon:'🔍',desc:'Analisis domain secara otomatis per kasus',price:200,rarity:'common',effect:'domain_scan'},
  {id:'s2',name:'IP Geolocator',icon:'🌍',desc:'Tampilkan lokasi server IP mencurigakan',price:350,rarity:'rare',effect:'ip_check'},
  {id:'s3',name:'SSL Inspector',icon:'🔒',desc:'Verifikasi sertifikat SSL website',price:300,rarity:'rare',effect:'ssl_check'},
  {id:'s4',name:'VirusTotal Scanner',icon:'🦠',desc:'Scan file dengan 72 antivirus engine',price:500,rarity:'epic',effect:'vt_scan'},
  {id:'s5',name:'AVA Premium',icon:'🤖',desc:'AVA memberikan analisis mendalam tanpa batas',price:800,rarity:'epic',effect:'ava_pro'},
  {id:'s6',name:'Time Freeze',icon:'⏸️',desc:'Hentikan timer 30 detik (1x pakai per misi)',price:150,rarity:'common',effect:'time_freeze',consumable:true},
  {id:'s7',name:'Hint Reveal',icon:'💡',desc:'Ungkap semua clue tersembunyi (1x pakai)',price:120,rarity:'common',effect:'hint_reveal',consumable:true},
  {id:'s8',name:'Shield',icon:'🛡️',desc:'Lindungi dari -HP sekali (1x pakai)',price:100,rarity:'common',effect:'shield',consumable:true},
  {id:'s9',name:'Expert Badge',icon:'🏅',desc:'Bonus EXP +50% selama 3 misi',price:600,rarity:'epic',effect:'exp_boost'},
  {id:'s10',name:'Legendary Scanner',icon:'⚡',desc:'Auto-detect semua threat indicators',price:1500,rarity:'legend',effect:'legend_scan'},
];

/* ════════════════════════════════════
   ACHIEVEMENTS DATA
════════════════════════════════════ */
const ACHIEVEMENTS = [
  {id:'ach1',icon:'🎯',name:'First Blood',desc:'Selesaikan misi pertamamu',condition:p=>p.researchData.missionsCompleted>=1},
  {id:'ach2',icon:'🔥',name:'On Fire',desc:'3 jawaban benar berturut-turut',condition:p=>p.streak>=3},
  {id:'ach3',icon:'🧠',name:'Big Brain',desc:'Capai akurasi 90% atau lebih',condition:p=>accuracy(p)>=90},
  {id:'ach4',icon:'⚡',name:'Speed Demon',desc:'Jawab dalam 5 detik',condition:p=>p.researchData.fastestResponse<=5},
  {id:'ach5',icon:'🕵️',name:'Master Detective',desc:'Selesaikan 5 misi',condition:p=>p.researchData.missionsCompleted>=5},
  {id:'ach6',icon:'💰',name:'Shopping Spree',desc:'Beli 3 item dari shop',condition:p=>(p.researchData.shopPurchases||0)>=3},
  {id:'ach7',icon:'🌳',name:'Skill Collector',desc:'Pelajari 3 skill',condition:p=>p.learnedSkills.length>=3},
  {id:'ach8',icon:'👑',name:'Cyber Legend',desc:'Capai Level 5',condition:p=>p.level>=5},
];

/* ════════════════════════════════════
   LEADERBOARD (simulated)
════════════════════════════════════ */
const LEADERBOARD_BASE = [
  {name:'AgentZero_X',avatar:'🥷',level:12,score:4250},
  {name:'CyberHunter99',avatar:'👩‍💻',level:10,score:3800},
  {name:'Ph1sh3rKing',avatar:'🦾',level:8,score:3100},
  {name:'SecuBot_3000',avatar:'🤖',level:7,score:2700},
  {name:'NullByte_Z',avatar:'🕵️',level:6,score:2200},
];

/* ════════════════════════════════════
   PLAYER FACTORY
════════════════════════════════════ */
function createPlayer(name, avatar, spec='analyst', email='', fullname='') {
  return {
    name,
    username: name,
    fullname: fullname || name,
    email,
    avatar,
    spec,
    level: 1,
    exp: 0,
    expNeeded: 100,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    credits: 500,
    skillPoints: 2,
    learnedSkills: [],
    inventory: ['s6','s7','s8'], // start items
    completedMissions: [],
    unlockedAchievements: [],
    streak: 0,
    researchData: {
      totalSessions: 0,
      missionsCompleted: 0,
      totalCorrect: 0,
      totalWrong: 0,
      falsePositive: 0,
      falseNegative: 0,
      responseTimes: [],
      fastestResponse: 999,
      decisionLog: [],
      threatTypeStats: {phishing:0,social:0,web:0,malware:0,scam:0},
      threatTypeCorrect: {phishing:0,social:0,web:0,malware:0,scam:0},
      shopPurchases: 0,
    }
  };
}
function migratePlayer(saved) {
  const name = normalizeAgentName(saved?.name) || 'Agent';
  const base = createPlayer(name, saved?.avatar || '🕵️', saved?.spec || 'analyst');
  return {
    ...base,
    ...saved,
    name,
    researchData: { ...base.researchData, ...(saved.researchData || {}) },
    learnedSkills: Array.isArray(saved.learnedSkills) ? saved.learnedSkills : base.learnedSkills,
    inventory: Array.isArray(saved.inventory) ? saved.inventory : base.inventory,
    completedMissions: Array.isArray(saved.completedMissions) ? saved.completedMissions : base.completedMissions,
    unlockedAchievements: Array.isArray(saved.unlockedAchievements) ? saved.unlockedAchievements : base.unlockedAchievements,
  };
}
function accuracy(p) {
  const total = p.researchData.totalCorrect + p.researchData.totalWrong;
  return total === 0 ? 0 : Math.round(p.researchData.totalCorrect / total * 100);
}
function getAwarenessIndex(p) {
  const acc = accuracy(p);
  const speed = p.researchData.responseTimes.length > 0
    ? Math.max(0, 100 - (p.researchData.responseTimes.reduce((a,b)=>a+b,0)/p.researchData.responseTimes.length)*2)
    : 50;
  return Math.min(100, Math.round((acc * 0.7) + (speed * 0.3)));
}
function getRank(p) {
  const score = p.researchData.totalCorrect * 50 + p.level * 30;
  for(let i=RANKS.length-1;i>=0;i--) if(score>=RANKS[i].min) return RANKS[i];
  return RANKS[0];
}

/* ════════════════════════════════════
   SAVE / LOAD
════════════════════════════════════ */
function savePlayer() {
  if (!G.player) return;
  const key = storageKeyForPlayer(G.player.name);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(G.player));
  if (G.serverOnline) {
    savePlayerToServer(G.player).then((ok) => {
      if (!ok) notify('SYNC', 'Gagal menyimpan ke server. Data tetap di perangkat.', 'notif-red');
    });
  }
}
async function loadPlayer(name) {
  const key = storageKeyForPlayer(name);
  if (!key) return null;

  if (G.serverOnline) {
    const remote = await fetchPlayerFromServer(name);
    if (remote && typeof remote === 'object') {
      localStorage.setItem(key, JSON.stringify(remote));
      return migratePlayer(remote);
    }
  }

  const parsed = safeJsonParse(localStorage.getItem(key));
  if (!parsed || typeof parsed !== 'object') return null;
  return migratePlayer(parsed);
}
async function refreshServerConnection() {
  const health = await checkServerHealth();
  G.serverOnline = health.online;
  updateServerStatus();
  return health.online;
}
function updateServerStatus() {
  const el = document.getElementById('server-status');
  if (!el) return;
  const base = getApiBase() || window.location.origin;
  if (G.serverOnline) {
    el.textContent = `SERVER ONLINE (${base})`;
    el.style.color = 'var(--green)';
  } else {
    el.textContent = 'SERVER OFFLINE — jalankan: npm run dev di folder cyberSecurityGame';
    el.style.color = 'var(--orange)';
  }
}

/* ════════════════════════════════════
   BOOT SEQUENCE
════════════════════════════════════ */
const BOOT_LINES = [
  '> CYBERGUARD OS v2.4.1 — Initializing...',
  '> Loading threat detection modules... [OK]',
  '> Initializing AVA Neural Network... [OK]',
  '> Connecting to CyberGuard Command Center... [OK]',
  '> Loading mission database (247 cases)... [OK]',
  '> Calibrating risk assessment engine... [OK]',
  '> Running adaptive learning algorithms... [OK]',
  '> System integrity check... PASSED',
  '> All systems nominal. Welcome, Investigator.',
  '> Launching interface...',
];

function startBoot() {
  let line = 0, char = 0;
  const el = document.getElementById('boot-text');
  const full = BOOT_LINES.join('\n');
  const interval = setInterval(() => {
    if(char < full.length) {
      el.textContent = full.substring(0, char);
      char += 2;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        document.getElementById('boot-cursor').style.display='none';
        showScreen('login');
      }, 800);
    }
  }, 20);
}

/* ════════════════════════════════════
   SCREEN MANAGEMENT
════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showPanel(id, navEl) {
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(navEl){
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    navEl.classList.add('active');
  }
  if(id==='panel-stats') updateStatsPanel();
  if(id==='panel-leaderboard') renderLeaderboard();
  if(id==='panel-achievements') renderAchievements();
  if(id==='panel-skills') renderSkillTree();
  if(id==='panel-inventory') renderInventory();
  if(id==='panel-shop') renderShop();
  if (id === 'panel-arena') {
    const wmc = document.getElementById('world-map-container');
    if (wmc) {
      initWorldMap(wmc, (zoneId, locked) => {
        if (locked) {
          if (window.showNotification) showNotification('danger','ZONE LOCKED','Butuh Level 10 untuk membuka Darknet Sector.');
          return;
        }
        const label = document.getElementById('arena-selected-zone');
        const names = {
          phishing: 'PHISHING DISTRICT', social: 'SOCIAL ENG. HUB',
          web: 'WEB THREAT SECTOR', malware: 'MALWARE QUARANTINE', scam: 'SCAM NETWORK ZONE',
        };
        if (label) label.textContent = `// Zone dipilih: ${names[zoneId] || zoneId.toUpperCase()} — Siap masuk arena?`;
      });
    }
  } else {
    destroyWorldMap();
  }
}
function switchTab(show, hide, btn) {
  document.getElementById(show).style.display='block';
  document.getElementById(hide).style.display='none';
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

/* ════════════════════════════════════
   LOGIN / REGISTER
════════════════════════════════════ */
function selectAvatar(el, avatar) {
  document.querySelectorAll('#login-avatar-row .avatar-opt').forEach(a=>a.classList.remove('sel'));
  el.classList.add('sel'); G.selectedAvatar = avatar;
}
function selectAvatar2(el, avatar) {
  document.querySelectorAll('#reg-avatar-row .avatar-opt').forEach(a=>a.classList.remove('sel'));
  el.classList.add('sel'); G.selectedAvatar2 = avatar;
}
async function doLogin() {
  const rawName = document.getElementById('login-name').value;
  const name = normalizeAgentName(rawName);
  if (!isValidAgentName(rawName)) {
    notify('ERROR', 'Nama agent minimal 4 karakter, tidak boleh hanya angka, dan tidak boleh 1 huruf.', 'notif-red');
    return;
  }
  await refreshServerConnection();
  const saved = await loadPlayer(name);
  if (!saved) {
    notify('ERROR', 'Akun tidak ditemukan. Silakan register terlebih dahulu.', 'notif-red');
    return;
  }
  G.player = saved;
  notify('LOGIN', 'Selamat datang kembali, ' + name + '!', 'notif-cyan');
  enterHub();
}

function doLogout() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
  G.player = null;
  showScreen('login');
  notify('LOGOUT', 'Anda telah keluar. Silakan login kembali.', 'notif-yellow');
}
function isValidEmail(email) {
  if (!email || email.length < 6) return false;
  if (/\s/.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (local.length < 4) return false;
  if (!/^[A-Za-z0-9._%+-]+$/.test(local)) return false;
  if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(domain)) return false;
  const domainParts = domain.split('.');
  if (domainParts.some(part => part.length < 2)) return false;
  return true;
}

async function doRegister() {
  const rawUsername = document.getElementById('reg-username').value;
  const username = normalizeAgentName(rawUsername);
  const fullname = document.getElementById('reg-fullname').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const spec = document.getElementById('reg-spec').value;

  if (!isValidAgentName(rawUsername)) {
    notify('ERROR', 'Username minimal 4 karakter, tidak boleh hanya angka, dan tidak boleh 1 huruf.', 'notif-red');
    return;
  }
  if (!fullname || fullname.length < 3) {
    notify('ERROR', 'Full name harus diisi dan minimal 3 karakter.', 'notif-red');
    return;
  }
  if (!isValidEmail(email)) {
    notify('ERROR', 'Email tidak valid. Masukkan email yang benar.', 'notif-red');
    return;
  }

  await refreshServerConnection();
  if (await loadPlayer(username)) {
    notify('ERROR', 'Username sudah terdaftar. Gunakan LOGIN.', 'notif-red');
    return;
  }

  G.player = createPlayer(username, G.selectedAvatar2, spec, email, fullname);
  // spec bonus
  if (spec === 'analyst') G.player.researchData.totalCorrect = 0;
  if (spec === 'detective') G.player.learnedSkills.push('d1');
  if (spec === 'hacker') G.player.credits += 100;
  savePlayer();
  notify('AGENT CREATED', 'Selamat bergabung, ' + fullname + '!', 'notif-green');
  enterHub();
}

/* ════════════════════════════════════
   HUB
════════════════════════════════════ */
async function enterHub() {
  showScreen('hub');
  await refreshServerConnection();
  const badge = document.getElementById('mission-badge');
  if (badge) badge.textContent = String(MISSIONS_DB.length);
  updateSidebar();
  renderMissions();
  renderSkillTree();
  renderInventory();
  renderShop();
  renderAchievements();
  renderLeaderboard();
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(updateClock, 1000);
  updateClock();
  setAvaHubMsg();
}
function updateSidebar() {
  const p = G.player;
  document.getElementById('sb-avatar').textContent = p.avatar;
  document.getElementById('sb-name').textContent = p.name.toUpperCase();
  const rank = getRank(p);
  document.getElementById('sb-rank').textContent = rank.name;
  document.getElementById('sb-rank').style.color = rank.color;
  const expPct = Math.min(100, (p.exp / p.expNeeded)*100);
  document.getElementById('sb-exp').textContent = p.exp+'/'+p.expNeeded;
  document.getElementById('sb-xp-bar').style.width = expPct+'%';
  document.getElementById('sb-hp').textContent = p.hp+'/'+p.maxHp;
  document.getElementById('sb-hp-bar').style.width = (p.hp/p.maxHp*100)+'%';
  document.getElementById('sb-sta').textContent = p.stamina+'/'+p.maxStamina;
  document.getElementById('sb-sta-bar').style.width = (p.stamina/p.maxStamina*100)+'%';
  document.getElementById('sb-credits').textContent = p.credits;
  document.getElementById('topbar-level').textContent = p.level;
  document.getElementById('qs-level').textContent = p.level;
  document.getElementById('qs-accuracy').textContent = (accuracy(p)||0)+'%';
  document.getElementById('qs-missions').textContent = p.researchData.missionsCompleted;
  document.getElementById('qs-streak').textContent = p.streak;
  document.getElementById('shop-credits').textContent = p.credits;
  document.getElementById('sp-display').textContent = p.skillPoints;
}
function updateClock() {
  const now = new Date();
  document.getElementById('topbar-time').textContent =
    now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
function setAvaHubMsg() {
  const p = G.player;
  const msgs = [
    'Deteksi ancaman terbaru: Phishing email naik 47% bulan ini.',
    'Tip: Selalu verifikasi domain pengirim sebelum klik link apapun.',
    'Misi baru tersedia di Malware Quarantine Zone!',
    `Akurasi kamu saat ini: ${accuracy(p)}%. Target 90% untuk badge Expert.`,
    'Remember: Bank tidak pernah minta PIN via email atau SMS.',
  ];
  document.getElementById('ava-hub-msg').textContent = msgs[Math.floor(Math.random()*msgs.length)];
}

/* ════════════════════════════════════
   MISSIONS
════════════════════════════════════ */
function renderMissions(filter='all') {
  const p = G.player;
  const list = document.getElementById('mission-list');
  list.innerHTML = '';
  MISSIONS_DB.filter(m => filter==='all' || m.type===filter).forEach(m => {
    const done = p.completedMissions.includes(m.id);
    const card = document.createElement('div');
    card.className = 'mission-card' + (done?' completed':'');
    card.onclick = () => startMission(m);
    const diffColors = {EASY:'var(--green)',MEDIUM:'var(--yellow)',HARD:'var(--red)'};
    card.innerHTML = `
      <div class="mission-icon">${m.icon}</div>
      <div class="mission-info">
        <div class="mission-name">${done?'✅ ':''} ${m.name}</div>
        <div class="mission-desc">${m.desc}</div>
        <div class="mission-tags">${m.tags.map(t=>`<span class="m-tag tag-${t}">${t.toUpperCase()}</span>`).join('')}</div>
      </div>
      <div class="mission-meta">
        <div class="mission-reward">💰 ${m.reward} CR</div>
        <div class="mission-xp">⚡ ${m.xp} XP</div>
        <div class="mission-diff" style="color:${diffColors[m.difficulty]}">${m.difficulty}</div>
        ${done?'<div style="font-size:10px;color:var(--green);margin-top:4px;">COMPLETED</div>':''}
      </div>
    `;
    list.appendChild(card);
  });
}
function filterMissions(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderMissions(type);
}
function goToZone(zone) {
  showPanel('panel-missions', document.querySelector('.nav-item:nth-child(2)'));
  filterMissions(zone, document.querySelector(`.filter-btn:nth-child(${['all','phishing','social','web','malware','scam'].indexOf(zone)+1})`)||document.querySelector('.filter-btn'));
}

/* ════════════════════════════════════
   MISSION START / GAMEPLAY
════════════════════════════════════ */
function startMission(mission) {
  G.currentMission = mission;
  G.currentCaseIndex = 0;
  G.gameScore = 0;
  G.sessionData = [];
  showScreen('gameplay');
  document.getElementById('gp-mission-title').textContent = '// ' + mission.name;
  document.getElementById('gp-case-total').textContent = mission.cases.length;
  loadCase();
}
function loadCase() {
  const mission = G.currentMission;
  if(G.currentCaseIndex >= mission.cases.length) { endMission(); return; }
  const c = mission.cases[G.currentCaseIndex];
  G.caseStartTime = Date.now();
  document.getElementById('gp-case-num').textContent = G.currentCaseIndex+1;

  // Render threat header
  const typeMap = {
    phishing:'threat-type-phishing',social:'threat-type-social',
    web:'threat-type-web',malware:'threat-type-malware',scam:'threat-type-scam',
  };
  document.getElementById('threat-badge').className = 'threat-type-badge '+(typeMap[c.type]||'threat-type-phishing');
  document.getElementById('threat-badge').textContent = c.type.toUpperCase()+' THREAT';
  document.getElementById('threat-name').textContent = c.title;
  document.getElementById('threat-sub').textContent = c.subtitle;

  // Render artifact
  renderArtifact(c.artifact);

  // Render indicators
  const indList = document.getElementById('indicators-list');
  indList.innerHTML = c.indicators.map(ind=>`
    <div class="indicator-row">
      <div class="ind-icon">${ind.icon}</div>
      <div class="ind-label">${ind.label}</div>
      <div class="ind-status ${ind.class}">${ind.status}</div>
    </div>
  `).join('');

  // Render clues
  if(c.clues && c.clues.length) {
    document.getElementById('clue-area').style.display='block';
    document.getElementById('clues-list').innerHTML = c.clues.map((cl,i)=>`
      <div class="clue-item" id="clue-${i}" onclick="toggleClue(${i})">
        <div class="clue-check" id="clue-chk-${i}"></div>
        <div>${escapeHtml(cl.text)}</div>
      </div>
    `).join('');
  } else { document.getElementById('clue-area').style.display='none'; }

  // Render risk
  updateRisk(c.riskScore, c.phishIndicators);

  // Adaptive learning hint
  document.getElementById('adaptive-hint').textContent = c.adaptiveHint || 'Analisis semua indikator sebelum memutuskan.';

  // AVA initial message
  addAvaMsg(c.avaHints[0] || 'Analisis indikator ancaman dengan teliti.');

  // Tools
  renderTools(c);

  // Timer
  startTimer(G.player.learnedSkills.includes('d3') ? 45 : 30);
}

function renderArtifact(art) {
  const container = document.getElementById('artifact-container');
  if(art.type==='email') {
    container.innerHTML = `
      <div class="artifact-card">
        <div class="artifact-topbar">
          <div class="artifact-dot dot-red"></div>
          <div class="artifact-dot dot-yellow"></div>
          <div class="artifact-dot dot-green"></div>
          <div style="flex:1;margin-left:8px;font-family:var(--hud);font-size:11px;color:var(--cyan);">📧 EMAIL INSPECTOR</div>
        </div>
        <div class="artifact-body">
          <div class="email-meta-row">
            <strong>FROM:</strong>
            <span class="addr ${art.fromSafe?'addr-safe':'addr-sus'}">${escapeHtml(art.from)}</span>
          </div>
          <div class="email-meta-row"><strong>TO:</strong> <span class="addr">${escapeHtml(art.to)}</span></div>
          <div class="email-meta-row"><strong>SUBJECT:</strong> <strong style="color:var(--white)">${escapeHtml(art.subject)}</strong></div>
          <hr style="border-color:var(--border);margin:12px 0;">
          <div style="white-space:pre-wrap;line-height:1.8;">${art.body}</div>
        </div>
      </div>
    `;
  } else if(art.type==='website') {
    container.innerHTML = `
      <div class="artifact-card">
        <div class="artifact-topbar">
          <div class="artifact-dot dot-red"></div>
          <div class="artifact-dot dot-yellow"></div>
          <div class="artifact-dot dot-green"></div>
          <div class="artifact-url">${escapeHtml(art.url)}</div>
          <span style="font-size:11px;color:var(--red);">⚠️ NO HTTPS</span>
        </div>
        <div class="artifact-body">
          <div style="font-family:var(--mono);font-size:12px;line-height:1.8;color:var(--text);white-space:pre-wrap;">${art.body}</div>
        </div>
      </div>
    `;
  } else if(art.type==='file') {
    container.innerHTML = `
      <div class="artifact-card">
        <div class="artifact-topbar">
          <div style="font-family:var(--hud);font-size:11px;color:var(--orange);">📁 FILE FORENSICS TOOL</div>
        </div>
        <div class="artifact-body">
          <div style="font-family:var(--mono);font-size:12px;line-height:1.8;color:var(--text);white-space:pre-wrap;">${art.body}</div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="artifact-card">
        <div class="artifact-topbar">
          <div style="font-family:var(--hud);font-size:11px;color:var(--purple);">💬 CHAT / SOCIAL MEDIA INSPECTOR</div>
        </div>
        <div class="artifact-body">
          <div style="font-family:var(--mono);font-size:12px;line-height:1.8;color:var(--text);white-space:pre-wrap;">${art.body}</div>
        </div>
      </div>
    `;
  }
}

function updateRisk(score, indicators) {
  const fill = document.getElementById('risk-fill');
  const val = document.getElementById('risk-val');
  const color = score>80?'var(--red)':score>50?'var(--orange)':score>25?'var(--yellow)':'var(--green)';
  fill.style.width = score+'%';
  fill.style.background = color;
  val.textContent = score+'%';
  const pi = document.getElementById('phish-indicators');
  if(indicators) pi.innerHTML = indicators.map(i=>`
    <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--surface2);border:1px solid var(--border);margin-bottom:5px;font-size:11px;">
      <span style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0;"></span>
      <span>${i}</span>
    </div>
  `).join('');
}

function renderTools(c) {
  const p = G.player;
  const tools = [
    {icon:'🔍',name:'Domain Checker',desc:'Verifikasi domain pengirim',owned:p.inventory.includes('s1')},
    {icon:'🌍',name:'IP Locator',desc:'Cek lokasi server',owned:p.inventory.includes('s2')},
    {icon:'🔒',name:'SSL Inspector',desc:'Verifikasi sertifikat',owned:p.inventory.includes('s3')},
    {icon:'🦠',name:'VirusTotal',desc:'Scan malware',owned:p.inventory.includes('s4')},
  ];
  document.getElementById('tools-list').innerHTML = tools.map(t=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface2);border:1px solid ${t.owned?'var(--cyan)':'var(--border)'};margin-bottom:8px;opacity:${t.owned?1:0.4};cursor:${t.owned?'pointer':'not-allowed'};">
      <span style="font-size:18px;">${t.icon}</span>
      <div>
        <div style="font-size:11px;color:${t.owned?'var(--white)':'var(--text2)'};">${t.name}</div>
        <div style="font-size:10px;color:var(--text2);">${t.desc}${t.owned?'':' — [BELI DI SHOP]'}</div>
      </div>
    </div>
  `).join('');
}

/* ════════════════════════════════════
   TIMER
════════════════════════════════════ */
function startTimer(seconds) {
  clearInterval(G.timerInterval);
  G.timeLeft = seconds;
  updateTimer();
  G.timerInterval = setInterval(()=>{
    G.timeLeft--;
    updateTimer();
    if(G.timeLeft <= 0) { clearInterval(G.timerInterval); autoTimeout(); }
  }, 1000);
}
function updateTimer() {
  const el = document.getElementById('gp-timer');
  const m = Math.floor(G.timeLeft/60).toString().padStart(2,'0');
  const s = (G.timeLeft%60).toString().padStart(2,'0');
  el.textContent = `${m}:${s}`;
  el.className = 'gp-timer' + (G.timeLeft<=10?' danger':'');
}
function autoTimeout() {
  submitVerdict('timeout');
}

/* ════════════════════════════════════
   VERDICT
════════════════════════════════════ */
function submitVerdict(verdict) {
  clearInterval(G.timerInterval);
  const c = G.currentMission.cases[G.currentCaseIndex];
  const rt = (Date.now() - G.caseStartTime) / 1000;
  const p = G.player;

  // Determine correctness
  let isCorrect = false;
  if(verdict === 'timeout') {
    isCorrect = false;
  } else if(c.correctVerdict === 'report') {
    isCorrect = verdict === 'report' || verdict === 'threat';
  } else {
    isCorrect = verdict === c.correctVerdict;
  }

  // Track false positives/negatives
  if(!isCorrect) {
    if(c.isPhishing && verdict==='safe') p.researchData.falseNegative++;
    if(!c.isPhishing && verdict==='threat') p.researchData.falsePositive++;
  }

  // Score calculation
  let pts = 0, xpGain = 0;
  if(isCorrect) {
    const speedBonus = G.player.learnedSkills.includes('h1') ? 1.2 : 1;
    pts = Math.round((50 + Math.max(0, G.timeLeft) * 2) * speedBonus);
    xpGain = 20 + Math.round(G.timeLeft/2);
    p.researchData.totalCorrect++;
    p.streak++;
    const ttype = mapThreatType(c.type);
    p.researchData.threatTypeCorrect[ttype] = (p.researchData.threatTypeCorrect[ttype]||0)+1;
  } else {
    pts = -10;
    xpGain = 5;
    p.researchData.totalWrong++;
    p.streak = 0;
    p.hp = Math.max(0, p.hp - 15);
    p.stamina = Math.max(0, p.stamina - 10);
  }

  // EXP boost item
  if(p.inventory.includes('s9')) xpGain = Math.round(xpGain * 1.5);

  // Update player
  G.gameScore += pts;
  p.exp += xpGain;
  p.researchData.responseTimes.push(rt);
  p.researchData.fastestResponse = Math.min(p.researchData.fastestResponse, rt);
  p.researchData.totalSessions++;

  const ttype2 = mapThreatType(c.type);
  p.researchData.threatTypeStats[ttype2] = (p.researchData.threatTypeStats[ttype2]||0)+1;
  p.researchData.decisionLog.push({
    caseId:c.id, type:c.type, verdict, correctVerdict:c.correctVerdict,
    isCorrect, responseTime:rt.toFixed(2), timestamp:new Date().toISOString()
  });

  // Level up check
  while(p.exp >= p.expNeeded) {
    p.exp -= p.expNeeded;
    p.level++;
    p.expNeeded = Math.round(p.expNeeded * 1.4);
    p.skillPoints++;
    p.hp = p.maxHp; p.stamina = p.maxStamina;
    notify('LEVEL UP! 🎉','Kamu naik ke Level '+p.level+'! +1 Skill Point','notif-yellow');
  }

  G.sessionData.push({verdict, isCorrect, pts, rt: rt.toFixed(1)});
  document.getElementById('gp-score').textContent = G.gameScore;

  // Show result modal
  showResultModal(isCorrect, c, pts, xpGain, rt, verdict);
  checkAchievements();
  savePlayer();
}

function showResultModal(isCorrect, c, pts, xpGain, rt, verdict) {
  const modal = document.getElementById('result-modal');
  document.getElementById('modal-icon').textContent = isCorrect ? '✅' : (verdict==='timeout'?'⏰':'❌');
  document.getElementById('modal-title').textContent = isCorrect ? 'ANCAMAN BERHASIL DIIDENTIFIKASI' : (verdict==='timeout'?'WAKTU HABIS!':'ANALISIS KURANG TEPAT');
  document.getElementById('modal-title').className = 'modal-result-title ' + (isCorrect?'result-correct':'result-wrong');
  document.getElementById('modal-sub').textContent = c.title;
  document.getElementById('modal-pts').textContent = (pts>0?'+':'')+pts;
  document.getElementById('modal-pts').style.color = pts>0?'var(--yellow)':'var(--red)';
  document.getElementById('modal-xp').textContent = '+'+xpGain+' XP';
  document.getElementById('modal-time').textContent = rt.toFixed(1)+'s';

  // Education
  const eduContent = document.getElementById('modal-edu-content');
  eduContent.innerHTML = (c.education||[]).map(e=>`
    <div class="edu-point"><span class="edu-bullet">▸</span><span>${escapeHtml(e)}</span></div>
  `).join('');

  // Clue reveal
  const cr = document.getElementById('modal-clue-reveal');
  if(!isCorrect && c.clues) {
    cr.innerHTML = `
      <div style="background:rgba(255,51,102,0.05);border:1px solid rgba(255,51,102,0.2);padding:12px;margin-bottom:12px;">
        <div style="font-family:var(--hud);font-size:10px;color:var(--red);letter-spacing:2px;margin-bottom:8px;">// MISSED INDICATORS</div>
        ${c.clues.map(cl=>`<div style="font-size:12px;color:var(--text);margin-bottom:4px;">⚠️ ${escapeHtml(cl.text)}</div>`).join('')}
      </div>
    `;
  } else cr.innerHTML='';

  // SFX
  if(isCorrect) {
    showSFX('CORRECT!','var(--green)');
  } else {
    showSFX(verdict==='timeout'?'TIMEOUT!':'WRONG!','var(--red)');
  }
  modal.classList.add('show');
}

function nextCase() {
  document.getElementById('result-modal').classList.remove('show');
  G.currentCaseIndex++;
  if(G.currentCaseIndex >= G.currentMission.cases.length) {
    endMission();
  } else {
    loadCase();
  }
}

function endMission() {
  clearInterval(G.timerInterval);
  const p = G.player;
  const m = G.currentMission;
  const correct = G.sessionData.filter(s=>s.isCorrect).length;
  const total = G.sessionData.length;
  const perf = total>0?Math.round(correct/total*100):0;

  if(!p.completedMissions.includes(m.id)) {
    p.completedMissions.push(m.id);
    p.researchData.missionsCompleted++;
    p.credits += m.reward;
    p.exp += m.xp;
    notify('MISSION COMPLETE! 🎉',`${m.name} selesai! +${m.reward} CR, +${m.xp} XP`,'notif-yellow');
  }
  savePlayer();
  showScreen('hub');
  updateSidebar();
  renderMissions();
  notify('SESSION COMPLETE',`Akurasi: ${perf}% (${correct}/${total}) | Score: ${G.gameScore}`,'notif-cyan');
}

function exitGameplay() {
  clearInterval(G.timerInterval);
  document.getElementById('result-modal').classList.remove('show');
  showScreen('hub');
  updateSidebar();
}
function openBattleArena() {

  console.trace("OPEN BATTLE");

  G.battle = createBattleState(G.player);

  showScreen('battle');

  if (window.startDuel) {

    G.battle.duel = true;

    window.startDuel(
      G.battle,
      G.player
    );

    return;
  }

  renderBattleUI();
}


  function exitBattle() {

  if (G.battle) {

    G.battle.duel = false;

    savePlayer();

    G.battle = null;
  }

  showScreen('hub');
}

function appendBattleLog(message) {
  if (!G.battle || !message) return;
  G.battle.log.push(message);
  if (G.battle.log.length > 10) G.battle.log = G.battle.log.slice(-10);
}

const detectiveSpritePixels = [
  'transparent','#0f2f4b','#0f2f4b','#0f2f4b','transparent',
  '#0f2f4b','transparent','#112237','transparent','#0f2f4b',
  '#112237','#112237','#2ac4ff','#112237','#112237',
  'transparent','#0b1624','#0b1624','#0b1624','transparent',
  'transparent','#00496b','#00496b','#00496b','transparent',
];

const tricksterSpritePixels = [
  'transparent','#2a0000','#2a0000','#2a0000','transparent',
  '#2a0000','transparent','#220000','transparent','#2a0000',
  '#220000','#220000','#ff4a7f','#220000','#220000',
  'transparent','#440011','#440011','#440011','transparent',
  'transparent','#880022','#880022','#880022','transparent',
];

const defaultPlayerSpritePixels = [
  'transparent','#d4af37','#d4af37','#d4af37','transparent',
  '#d4af37','transparent','#000000','transparent','#d4af37',
  '#000000','#000000','#ffd27f','#000000','#000000',
  'transparent','#111111','#111111','#111111','transparent',
  'transparent','#005577','#005577','#005577','transparent',
];

const enemySpritePixels = [
  'transparent','#ff4a7f','#ff4a7f','#ff4a7f','transparent',
  '#ff4a7f','transparent','#220000','transparent','#ff4a7f',
  '#220000','#220000','#ff8ca9','#220000','#220000',
  'transparent','#440011','#440011','#440011','transparent',
  'transparent','#880022','#880022','#880022','transparent',
];

function getPlayerSpritePixels(avatar) {
  if (avatar === '🕵️' || avatar === '👩‍💻') return detectiveSpritePixels;
  if (avatar === '🦾' || avatar === '🥷') return tricksterSpritePixels;
  return defaultPlayerSpritePixels;
}

function renderPortrait(el, pixels) {
  if (!el) return;
  el.innerHTML = '';
  el.appendChild(buildSprite(pixels));
}

function renderBattleUI() {
  if (!G.battle) return;
  document.getElementById('battle-turn-label').textContent = `TURN ${G.battle.turn}`;
  renderBattleMap();
  renderBattleStatus();
  renderBattleSkills();
  renderBattleLog();
}

function buildSprite(pixels) {
  const sprite = document.createElement('div');
  sprite.className = 'battle-sprite pixel-sprite';
  pixels.forEach(color => {
    const block = document.createElement('span');
    block.className = 'pixel-block';
    block.style.backgroundColor = color;
    sprite.appendChild(block);
  });
  return sprite;
}

function renderBattleMap() {
  const state = G.battle;
  if (state && state.duel) return;
  const container = document.getElementById('battle-map');
  if (!container) return;
  container.innerHTML = '';

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const tile = document.createElement('div');
      tile.className = 'battle-stage-tile';
      const obstacle = state.obstacles.some(o => o.x === x && o.y === y);
      if (state.playerPos.x === x && state.playerPos.y === y) {
        tile.classList.add('player');
        tile.appendChild(buildSprite(getPlayerSpritePixels(G.player?.avatar || '🕵️')));
      } else if (state.enemyPos.x === x && state.enemyPos.y === y) {
        tile.classList.add('enemy');
        tile.appendChild(buildSprite(enemySpritePixels));
      } else if (obstacle) {
        tile.classList.add('obstacle');
      }
      container.appendChild(tile);
    }
  }
}

function renderBattleStatus() {
  const state = G.battle;
  const player = G.player;
  if (!state || !player) return;
  const playerHpBar = document.getElementById('battle-player-hp-bar');
  const playerStaBar = document.getElementById('battle-player-sta-bar');
  const enemyHpBar = document.getElementById('battle-enemy-hp-bar');
  const playerAvatarEl = document.getElementById('battle-player-avatar');
  const enemyAvatarEl = document.getElementById('battle-enemy-avatar');
  renderPortrait(playerAvatarEl, getPlayerSpritePixels(player.avatar));
  renderPortrait(enemyAvatarEl, enemySpritePixels);
  document.getElementById('battle-player-name').textContent = player.name.toUpperCase();
  document.getElementById('battle-player-hp-val').textContent = `${player.hp}/${player.maxHp}`;
  document.getElementById('battle-player-sta-val').textContent = `${player.stamina}/${player.maxStamina}`;
  document.getElementById('battle-enemy-name').textContent = `ROGUE AI LV.${Math.max(1, Math.round((state.enemyMaxHp - 70) / 18 + 1))}`;
  document.getElementById('battle-enemy-hp-val').textContent = `${state.enemyHp}/${state.enemyMaxHp}`;
  document.getElementById('battle-enemy-desc').textContent = `ATK ${state.enemyAttack} · DEF ${Math.max(0, state.enemyDefense + state.enemyDefenseDebuff - (state.scanned ? 2 : 0))}`;
  if (playerHpBar) playerHpBar.style.width = `${Math.max(0, player.hp / player.maxHp * 100)}%`;
  if (playerStaBar) playerStaBar.style.width = `${Math.max(0, player.stamina / player.maxStamina * 100)}%`;
  if (enemyHpBar) enemyHpBar.style.width = `${Math.max(0, state.enemyHp / state.enemyMaxHp * 100)}%`;
}

function renderBattleSkills() {
  const skills = getBattleSkills(G.player);
  const list = document.getElementById('battle-skill-list');
  if (!list) return;
  list.innerHTML = skills.map(skill => {
    const handler = (G.battle && G.battle.duel) ? `performDuelSkill('${skill.id}')` : `battleUseSkill('${skill.id}')`;
    return `
    <div style="display:flex;flex-direction:column;gap:4px;">
      <button class="btn btn-sm" style="width:100%;text-align:left;" onclick="${handler}">${skill.name}</button>
      <div style="font-size:10px;color:var(--text2);">${skill.desc}</div>
    </div>
  `;
  }).join('');
}

function renderBattleLog() {
  const state = G.battle;
  const log = document.getElementById('battle-log');
  if (!state || !log) return;
  log.innerHTML = state.log.map(line => `<div style="margin-bottom:6px;">${escapeHtml(line)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}

function battleMove(direction) {
  if (!G.battle) return;
  const result = applyBattleMove(G.battle, direction, G.player);
  appendBattleLog(result);
  renderBattleUI();
  if (!checkBattleState()) {
    savePlayer();
  }
}

function battleUseSkill(id) {
  if (!G.battle) return;
  const result = applyBattleSkill(G.battle, id, G.player);
  appendBattleLog(result);
  if (G.battle.enemyHp > 0 && G.player.hp > 0 && id !== 'attack') {
    const enemyResult = battleEnemyAction(G.battle, G.player);
    appendBattleLog(enemyResult);
  }
  G.battle.turn++;
  renderBattleUI();
  if (!checkBattleState()) {
    savePlayer();
  }
}

function checkBattleState() {
  if (!G.battle) return false;
  if (G.battle.enemyHp <= 0) {
    appendBattleLog('Kamu menang dalam duel ini!');
    G.player.credits += 120;
    G.player.exp += 40;
    notify('DUEL VICTORY', 'Kamu memenangkan duel! +120 CR, +40 XP', 'notif-green');
    savePlayer();
    setTimeout(exitBattle, 900);
    return true;
  }
  if (G.player.hp <= 0) {
    appendBattleLog('Kamu dikalahkan... Istirahat dan coba lagi.');
    notify('DUEL DEFEAT', 'Kamu kalah di duel. Kembalilah dengan HP lebih baik.', 'notif-red');
    savePlayer();
    setTimeout(exitBattle, 900);
    return true;
  }
  return false;
}

const DUEL_KEYS = new Set(['ArrowLeft','ArrowRight','ArrowUp','a','d','w','A','D','W',' ']);

window.addEventListener('keydown', (event) => {
  if (!G.battle) return;
  // In duel mode: send key to duel movement engine — NOT battleMove (which deals damage)
  if (G.battle.duel) {
    if (DUEL_KEYS.has(event.key)) {
      event.preventDefault();
      if (window.handleDuelKey) window.handleDuelKey(event.key, true);
    }
    return;
  }
  const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  if (map[event.key]) {
    event.preventDefault();
    battleMove(map[event.key]);
  }
});

window.addEventListener('keyup', (event) => {
  if (!G.battle || !G.battle.duel) return;
  if (window.handleDuelKey) window.handleDuelKey(event.key, false);
});
window.openBattleArena = openBattleArena;
window.exitBattle = exitBattle;
window.battleMove = battleMove;
window.battleUseSkill = battleUseSkill;
window.appendBattleLog = appendBattleLog;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.selectAvatar = selectAvatar;
window.selectAvatar2 = selectAvatar2;
window.doLogout = doLogout;

/* ════════════════════════════════════
   AVA ASSISTANT
════════════════════════════════════ */
const AVA_RESPONSES = {
  phishing:['Domain palsu adalah tanda #1 phishing. Selalu cek domain pengirim.','Bank tidak pernah minta PIN via email — ini aturan universal.','Teknik pressure tactics (deadline palsu) digunakan untuk mencegah korban berpikir jernih.'],
  social:['Social engineering memanfaatkan psikologi manusia, bukan kelemahan teknis.','Selalu verifikasi identitas orang yang meminta akses atau informasi sensitif.','Penolakan untuk diverifikasi adalah red flag besar dalam social engineering.'],
  malware:['Ekstensi ganda (.pdf.exe) adalah teknik klasik menyembunyikan malware.','Selalu gunakan VirusTotal untuk cek file mencurigakan sebelum dibuka.','Malware modern bisa menonaktifkan antivirus — gunakan sandbox untuk analisis.'],
  web:['Tidak ada HTTPS? Jangan pernah masukkan data sensitif.','Domain baru (< 30 hari) yang mengklaim jadi bank atau e-commerce = sangat mencurigakan.','IP server dari negara asing untuk layanan lokal Indonesia adalah red flag.'],
  scam:['Return investasi > 100% dalam waktu singkat = Ponzi scheme, selalu.','Cek legalitas investasi di OJK: ojk.go.id sebelum invest apapun.','Bot testimonial mudah dikenali dari pola komentar yang seragam dan profil baru.'],
  general:['Cybersecurity awareness adalah pertahanan terbaik terhadap ancaman digital.','82% serangan siber berhasil bukan karena teknologi, tapi karena kelengahan manusia.','Ingat 3 langkah: Berhenti → Berpikir → Verifikasi sebelum klik link apapun.'],
};

function addAvaMsg(text) {
  const msgs = document.getElementById('ava-messages');
  if(!msgs) return;
  const div = document.createElement('div');
  div.className = 'ava-msg-bubble ava-bubble';
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function sendToAva() {
  const inp = document.getElementById('ava-input');
  const q = inp.value.trim();
  if(!q) return;

  const msgs = document.getElementById('ava-messages');
  const userDiv = document.createElement('div');
  userDiv.className = 'ava-msg-bubble player-bubble';
  userDiv.textContent = q;
  msgs.appendChild(userDiv);
  inp.value = '';

  const c = G.currentMission?.cases[G.currentCaseIndex];
  const response = pickAvaResponse(q, c?.avaHints, AVA_RESPONSES);
  setTimeout(() => addAvaMsg(response), 500);
  msgs.scrollTop = msgs.scrollHeight;
}

function openAvaPanel() { document.getElementById('ava-modal').classList.add('show'); }
function closeAva() { document.getElementById('ava-modal').classList.remove('show'); }
function addAvaHubMsg(text) {
  const msgs = document.getElementById('ava-hub-messages');
  const div = document.createElement('div');
  div.className = 'ava-msg-bubble ava-bubble';
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}
function sendAvaHub() {
  const inp = document.getElementById('ava-hub-input');
  const q = inp.value.trim();
  if(!q) return;
  const msgs = document.getElementById('ava-hub-messages');
  const ud = document.createElement('div');
  ud.className = 'ava-msg-bubble player-bubble';
  ud.textContent = q;
  msgs.appendChild(ud);
  inp.value = '';
  const r = pickAvaResponse(q, null, AVA_RESPONSES);
  setTimeout(() => addAvaHubMsg(r), 600);
}

/* ════════════════════════════════════
   SKILL TREE
════════════════════════════════════ */
function renderSkillTree() {
  const p = G.player;
  const branches = [
    {key:'analyst',title:'ANALYST BRANCH',cls:'branch-analyst'},
    {key:'detective',title:'DETECTIVE BRANCH',cls:'branch-detective'},
    {key:'hacker',title:'HACKER BRANCH',cls:'branch-hacker'},
  ];
  document.getElementById('skill-tree-grid').innerHTML = branches.map(b=>`
    <div class="skill-branch">
      <div class="branch-title ${b.cls}">${b.title}</div>
      ${SKILLS[b.key].map(sk=>{
        const learned = p.learnedSkills.includes(sk.id);
        const reqMet = !sk.requires || p.learnedSkills.includes(sk.requires);
        const locked = !reqMet;
        return `
          <div class="skill-node ${learned?'learned':''} ${locked?'locked':''}" onclick="learnSkill('${sk.id}','${b.key}')">
            ${learned?'<div class="skill-learned-tag">LEARNED</div>':''}
            <div class="skill-node-name">${sk.name}</div>
            <div class="skill-node-desc">${sk.desc}</div>
            ${locked?'<div class="skill-cost" style="color:var(--red);">🔒 Requires: ${sk.requires}</div>':
              learned?'':'<div class="skill-cost">⚡ Cost: ${sk.cost} SP</div>'}
          </div>
        `;
      }).join('')}
    </div>
  `).join('');
  document.getElementById('sp-display').textContent = p.skillPoints;
}
function learnSkill(id, branch) {
  const p = G.player;
  const sk = SKILLS[branch].find(s=>s.id===id);
  if(!sk) return;
  if(p.learnedSkills.includes(sk.id)){notify('INFO','Skill sudah dipelajari.','notif-cyan');return;}
  if(sk.requires && !p.learnedSkills.includes(sk.requires)){notify('ERROR','Unlock skill sebelumnya terlebih dahulu.','notif-red');return;}
  if(p.skillPoints < sk.cost){notify('ERROR','Skill Points tidak cukup!','notif-red');return;}
  p.skillPoints -= sk.cost;
  p.learnedSkills.push(sk.id);
  savePlayer();
  renderSkillTree();
  updateSidebar();
  notify('SKILL LEARNED ⚡',sk.name+' berhasil dipelajari!','notif-green');
  checkAchievements();
}

/* ════════════════════════════════════
   SHOP
════════════════════════════════════ */
function renderShop() {
  const p = G.player;
  const rarityOrder = {common:0,rare:1,epic:2,legend:3};
  document.getElementById('shop-grid').innerHTML = SHOP_ITEMS.map(item=>{
    const owned = p.inventory.includes(item.id);
    return `
      <div class="shop-item ${owned?'owned':''}" onclick="buyItem('${item.id}')">
        <div class="shop-rarity rarity-${item.rarity}">${item.rarity.toUpperCase()}</div>
        <div class="shop-icon">${item.icon}</div>
        <div class="shop-name">${item.name}</div>
        <div class="shop-desc">${item.desc}</div>
        ${owned?'<div style="font-size:11px;color:var(--green);">✅ OWNED</div>':`<div class="shop-price">💰 ${item.price} CR</div>`}
      </div>
    `;
  }).join('');
}
function buyItem(id) {
  const p = G.player;
  const item = SHOP_ITEMS.find(i=>i.id===id);
  if(!item) return;
  if(p.inventory.includes(id) && !item.consumable){notify('INFO','Item sudah dimiliki.','notif-cyan');return;}
  if(p.credits < item.price){notify('ERROR','Credits tidak cukup!','notif-red');return;}
  p.credits -= item.price;
  p.researchData.shopPurchases = (p.researchData.shopPurchases || 0) + 1;
  if (!p.inventory.includes(id)) p.inventory.push(id);
  savePlayer();
  renderShop();
  renderInventory();
  updateSidebar();
  notify('ITEM PURCHASED 🛒',item.name+' berhasil dibeli!','notif-green');
  checkAchievements();
}

/* ════════════════════════════════════
   INVENTORY
════════════════════════════════════ */
function renderInventory() {
  const p = G.player;
  const grid = document.getElementById('inventory-grid');
  const slots = 16;
  let html = '';
  for(let i=0;i<slots;i++){
    const itemId = p.inventory[i];
    if(itemId) {
      const item = SHOP_ITEMS.find(it=>it.id===itemId);
      if(item) html += `<div class="inv-slot" title="${item.desc}"><div class="inv-icon">${item.icon}</div><div class="inv-name">${item.name}</div><div class="inv-qty rarity-${item.rarity}">${item.rarity}</div></div>`;
    } else {
      html += `<div class="inv-slot empty"><div style="font-size:20px;color:var(--text3);">+</div></div>`;
    }
  }
  grid.innerHTML = html;
}

/* ════════════════════════════════════
   STATS / RESEARCH DASHBOARD
════════════════════════════════════ */
function updateStatsPanel() {
  const p = G.player;
  const r = p.researchData;
  const acc = accuracy(p);
  const avgRt = r.responseTimes.length > 0
    ? (r.responseTimes.reduce((a,b)=>a+b,0)/r.responseTimes.length).toFixed(1) : '--';

  document.getElementById('stat-sessions').textContent = r.totalSessions;
  document.getElementById('stat-accuracy').textContent = acc+'%';
  document.getElementById('stat-rt').textContent = avgRt+'s';
  document.getElementById('stat-correct').textContent = r.totalCorrect;
  document.getElementById('stat-wrong').textContent = r.totalWrong;
  document.getElementById('stat-fp').textContent = r.falsePositive;
  document.getElementById('stat-fn').textContent = r.falseNegative;

  const aw = getAwarenessIndex(p);
  document.getElementById('awareness-num').textContent = aw+'%';

  // Threat type accuracy
  ['phishing','social','web','malware','scam'].forEach(t=>{
    const total = r.threatTypeStats[t]||0;
    const correct = r.threatTypeCorrect[t]||0;
    const pct = total>0?Math.round(correct/total*100)+'%':'--';
    const el = document.getElementById('ai-'+t.replace('malware','mal').replace('phishing','phish'));
    if(el) el.textContent = pct;
  });
  document.getElementById('ttype-phish').textContent = (r.threatTypeStats.phishing||0)+' case';
  document.getElementById('ttype-social').textContent = (r.threatTypeStats.social||0)+' case';
  document.getElementById('ttype-web').textContent = (r.threatTypeStats.web||0)+' case';
  document.getElementById('ttype-mal').textContent = (r.threatTypeStats.malware||0)+' case';
  document.getElementById('ttype-scam').textContent = (r.threatTypeStats.scam||0)+' case';

  // Mini chart
  const rts = r.responseTimes.slice(-8);
  const chartEl = document.getElementById('rt-chart');
  if(rts.length > 0) {
    const max = Math.max(...rts);
    chartEl.innerHTML = rts.map(rt=>`
      <div class="chart-bar-mini" style="height:${Math.round(rt/max*100)}%;background:${rt<15?'var(--green)':rt<25?'var(--yellow)':'var(--red)'};" title="${rt.toFixed(1)}s"></div>
    `).join('');
  }
}

/* ════════════════════════════════════
   ACHIEVEMENTS
════════════════════════════════════ */
function checkAchievements() {
  const p = G.player;
  ACHIEVEMENTS.forEach(ach=>{
    if(!p.unlockedAchievements.includes(ach.id) && ach.condition(p)) {
      p.unlockedAchievements.push(ach.id);
      notify('ACHIEVEMENT UNLOCKED 🏆',ach.icon+' '+ach.name+': '+ach.desc,'notif-yellow');
    }
  });
  savePlayer();
}
function renderAchievements() {
  const p = G.player;
  document.getElementById('achievement-grid').innerHTML = ACHIEVEMENTS.map(ach=>{
    const unlocked = p.unlockedAchievements.includes(ach.id);
    return `
      <div class="ach-card ${unlocked?'unlocked':'locked'}">
        <div class="ach-icon">${ach.icon}</div>
        <div>
          <div class="ach-name" style="color:${unlocked?'var(--yellow)':'var(--text2)'}">${ach.name}</div>
          <div class="ach-desc">${ach.desc}</div>
          ${unlocked?'<div style="font-size:10px;color:var(--green);margin-top:2px;">✅ UNLOCKED</div>':'<div style="font-size:10px;color:var(--text3);">🔒 LOCKED</div>'}
        </div>
      </div>
    `;
  }).join('');
}

/* ════════════════════════════════════
   LEADERBOARD
════════════════════════════════════ */
async function renderLeaderboard() {
  const p = G.player;
  const playerScore = p.researchData.totalCorrect * 50 + p.level * 30 + G.gameScore;
  let base = [...LEADERBOARD_BASE];
  if (G.serverOnline) {
    const remote = await fetchLeaderboardFromServer();
    if (remote?.length) {
      base = remote.map((e) => ({
        name: e.name,
        avatar: e.avatar,
        level: e.level,
        score: e.score,
      }));
    }
  }
  const board = [...base, { name: p.name, avatar: p.avatar, level: p.level, score: playerScore, isSelf: true }]
    .sort((a, b) => b.score - a.score);

  const rankColors = ['lb-rank-1','lb-rank-2','lb-rank-3'];
  document.getElementById('leaderboard-list').innerHTML = board.map((entry,i)=>`
    <div class="lb-row ${entry.isSelf?'self':''}">
      <div class="lb-rank ${rankColors[i]||''}">${i+1}</div>
      <div class="lb-avatar">${entry.avatar}</div>
      <div class="lb-name">${escapeHtml(entry.name)} ${entry.isSelf?'<span style="font-size:10px;color:var(--cyan);">(YOU)</span>':''}</div>
      <div class="lb-level">LVL ${entry.level}</div>
      <div class="lb-score">${entry.score.toLocaleString()}</div>
    </div>
  `).join('');
}

/* ════════════════════════════════════
   CLUE TOGGLE
════════════════════════════════════ */
function toggleClue(i) {
  const item = document.getElementById('clue-'+i);
  const chk = document.getElementById('clue-chk-'+i);
  item.classList.toggle('found');
  chk.textContent = item.classList.contains('found') ? '✓' : '';
}

/* ════════════════════════════════════
   SIDEBAR TAB (GAMEPLAY)
════════════════════════════════════ */
function switchGpTab(tabId, btn) {
  ['tab-ava','tab-risk','tab-tools'].forEach(t=>{
    document.getElementById(t).style.display = t===tabId?'block':'none';
  });
  document.querySelectorAll('.gp-stab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

/* ════════════════════════════════════
   NOTIFICATIONS
════════════════════════════════════ */
function notify(title, msg, type='notif-cyan') {
  const container = document.getElementById('notif-container');
  const n = document.createElement('div');
  n.className = 'notif '+type;
  n.innerHTML = `<div class="notif-title">${escapeHtml(title)}</div><div>${escapeHtml(msg)}</div>`;
  container.appendChild(n);
  setTimeout(()=>{ n.style.opacity='0'; n.style.transition='opacity 0.3s'; setTimeout(()=>n.remove(),300); }, 3500);
}

/* ════════════════════════════════════
   SFX
════════════════════════════════════ */
function showSFX(text, color) {
  const el = document.getElementById('sfx-big');
  const t = document.getElementById('sfx-text-big');
  t.textContent = text;
  t.style.color = color;
  t.style.webkitTextStroke = '3px rgba(0,0,0,0.5)';
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),800);
}

/* ════════════════════════════════════
   EXPORT RESEARCH DATA
════════════════════════════════════ */
function exportJSON() {
  const p = G.player;
  const data = {
    exportTime: new Date().toISOString(),
    player: { name:p.name, level:p.level, avatar:p.avatar, spec:p.spec },
    summary: {
      totalSessions: p.researchData.totalSessions,
      missionsCompleted: p.researchData.missionsCompleted,
      accuracy: accuracy(p)+'%',
      awarenessIndex: getAwarenessIndex(p)+'%',
      avgResponseTime: p.researchData.responseTimes.length>0
        ? (p.researchData.responseTimes.reduce((a,b)=>a+b,0)/p.researchData.responseTimes.length).toFixed(2)+'s'
        : 'N/A',
      fastestResponse: p.researchData.fastestResponse<999?p.researchData.fastestResponse.toFixed(2)+'s':'N/A',
      falsePositive: p.researchData.falsePositive,
      falseNegative: p.researchData.falseNegative,
    },
    threatTypePerformance: {
      phishing: calcThreatPerf(p,'phishing'),
      social: calcThreatPerf(p,'social'),
      web: calcThreatPerf(p,'web'),
      malware: calcThreatPerf(p,'malware'),
      scam: calcThreatPerf(p,'scam'),
    },
    decisionLog: p.researchData.decisionLog,
    responseTimes: p.researchData.responseTimes.map(r=>+r.toFixed(2)),
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`cyberguard-research-${p.name}-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
  notify('EXPORT SUCCESS','Data JSON berhasil diunduh.','notif-green');
}
function calcThreatPerf(p, type) {
  const total = p.researchData.threatTypeStats[type]||0;
  const correct = p.researchData.threatTypeCorrect[type]||0;
  return { total, correct, accuracy: total>0?Math.round(correct/total*100)+'%':'N/A' };
}
function exportCSV() {
  const p = G.player;
  const rows = [['CaseID','Type','Verdict','CorrectVerdict','IsCorrect','ResponseTime(s)','Timestamp']];
  p.researchData.decisionLog.forEach(d => rows.push([
    d.caseId, d.type, d.verdict, d.correctVerdict, d.isCorrect, d.responseTime, d.timestamp,
  ]));
  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`cyberguard-research-${p.name}-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
  notify('EXPORT SUCCESS','Data CSV berhasil diunduh.','notif-green');
}

/* ════════════════════════════════════
   NPC SYSTEM
════════════════════════════════════ */
const NPCS = [
  {
    id:'npc1', name:'Director Hana', avatar:'👩‍💼', role:'CyberGuard Director',
    color:'var(--cyan)',
    intro:'Selamat datang di CyberGuard, Agent. Dunia digital semakin berbahaya. Tugas kamu adalah melindungi warga dari ancaman siber.',
    dialogues:[
      'Phishing masih menjadi ancaman #1 di Indonesia — 70% insiden siber berawal dari sini.',
      'Agent terbaik kami selalu verifikasi domain sebelum klik link apapun.',
      'Ingat: kesadaran adalah pertahanan terbaik. Teknologi saja tidak cukup.',
      'Data penelitian kamu sangat berharga untuk meningkatkan kesadaran siber nasional.',
    ],
    questHint:'Selesaikan misi Phishing District untuk membuka case baru.',
  },
  {
    id:'npc2', name:'Dev Marco', avatar:'👨‍💻', role:'Senior Cyber Analyst',
    color:'var(--green)',
    intro:'Yo! Aku Marco, specialist malware analysis. Kalau nemu file aneh, jangan dibuka dulu — scan dulu!',
    dialogues:[
      'File .pdf.exe adalah trik lama tapi masih makan korban ribuan orang tiap tahun.',
      'VirusTotal.com adalah teman terbaikmu untuk cek file mencurigakan — gratis!',
      'Ransomware modern bisa enkripsi semua file dalam hitungan menit. Backup itu wajib!',
      'Periksa ekstensi file sesungguhnya: di Windows, aktifkan "Show file name extensions".',
    ],
    questHint:'Coba misi File Forensics untuk latihan analisis malware.',
  },
  {
    id:'npc3', name:'Agent Rina', avatar:'🕵️‍♀️', role:'Social Engineering Specialist',
    color:'var(--purple)',
    intro:'Hei! Aku Rina. Social engineering adalah seni manipulasi manusia — bukan hack komputer. Pelajari polanya!',
    dialogues:[
      'Social engineer selalu memanfaatkan 6 prinsip psikologi: reciprocity, commitment, social proof, authority, liking, scarcity.',
      'Jika seseorang memintamu bertindak CEPAT tanpa boleh berpikir — itu manipulasi.',
      'Verifikasi identitas via jalur independen adalah pertahanan terkuat dari social engineering.',
      'Pretexting = menciptakan skenario palsu untuk mendapatkan kepercayaan korban.',
    ],
    questHint:'Investigasi kasus Social Engineering Hub untuk misi lanjutan.',
  },
  {
    id:'npc4', name:'Prof. Baskara', avatar:'👨‍🏫', role:'Cybersecurity Researcher',
    color:'var(--yellow)',
    intro:'Selamat bergabung! Saya Prof. Baskara, peneliti keamanan siber. Data dari training kamu membantu penelitian kami.',
    dialogues:[
      'Penelitian menunjukkan game edukasi meningkatkan security awareness 3x lebih efektif dari pelatihan konvensional.',
      'Response time dalam pengambilan keputusan adalah indikator tingkat automatisasi kognitif terhadap ancaman.',
      'False positive dan false negative adalah metrik penting dalam mengukur kalibrasi deteksi ancaman.',
      'Awareness Index kamu dihitung dari kombinasi akurasi dan kecepatan respons — dua komponen kognisi siber.',
    ],
    questHint:'Cek Research Dashboard untuk melihat perkembangan datamu.',
  },
];

let currentNpc = null;
let npcDialogIdx = 0;

function openNpc(npcId) {
  const npc = NPCS.find(n=>n.id===npcId);
  if(!npc) return;
  currentNpc = npc;
  npcDialogIdx = 0;
  const modal = document.getElementById('npc-modal');
  document.getElementById('npc-avatar-display').textContent = npc.avatar;
  document.getElementById('npc-name-display').textContent = npc.name;
  document.getElementById('npc-role-display').textContent = npc.role;
  document.getElementById('npc-name-display').style.color = npc.color;
  document.getElementById('npc-dialog-text').textContent = npc.intro;
  document.getElementById('npc-quest-hint').textContent = '📋 ' + npc.questHint;
  modal.classList.add('show');
}
function nextNpcDialog() {
  if(!currentNpc) return;
  const text = currentNpc.dialogues[npcDialogIdx % currentNpc.dialogues.length];
  document.getElementById('npc-dialog-text').textContent = text;
  npcDialogIdx++;
}
function closeNpc() { document.getElementById('npc-modal').classList.remove('show'); }

/* ════════════════════════════════════
   ADDITIONAL MISSIONS (m6-m8)
════════════════════════════════════ */
const EXTRA_MISSIONS = [
  {
    id:'m6', type:'phishing', name:'SMS SMISHING ALERT', icon:'📱',
    desc:'Analisis pesan SMS dan WhatsApp mencurigakan yang mengklaim dari bank, kurir, dan layanan pemerintah.',
    difficulty:'MEDIUM', reward:160, xp:80, tags:['phish','scam'],
    cases:[
      {
        id:'c8', type:'phishing',
        title:'SMS BRI Palsu — Verifikasi Kartu',
        subtitle:'SMS masuk mengklaim dari BRI, minta tindakan segera',
        artifact:{
          type:'chat',
          sender:'BRI-NOTIF (SMS)',
          body:`📱 SMS MASUK

Pengirim: BRI-NOTIF
Isi:
"[BRI] Kartu debit Anda akan DIBLOKIR 
dalam 24 jam karena aktivitas mencurigakan.

Segera verifikasi di:
http://bri-verif.me/kartu

atau hubungi: 0812-3456-7890

Abaikan jika sudah verifikasi."

─────────────────────
METADATA ANALISIS:
- Nomor pengirim: Bukan shortcode resmi BRI
- Link domain: bri-verif.me (BUKAN bri.co.id)
- Nomor HP: Bukan 14017 (call center resmi BRI)
- Waktu kirim: 02:34 WIB (tengah malam)`,
        },
        indicators:[
          {icon:'📱',label:'Pengirim bukan shortcode resmi BRI (14017)',status:'DANGER',class:'ind-danger'},
          {icon:'🌐',label:'Domain bri-verif.me bukan domain resmi BRI',status:'DANGER',class:'ind-danger'},
          {icon:'⏰',label:'Dikirim jam 02:34 dini hari (tidak normal)',status:'WARN',class:'ind-warn'},
          {icon:'📞',label:'Nomor HP alternatif bukan call center resmi',status:'WARN',class:'ind-warn'},
          {icon:'⏱️',label:'Ancaman blokir 24 jam (pressure tactics)',status:'WARN',class:'ind-warn'},
        ],
        riskScore:91,isPhishing:true,correctVerdict:'threat',
        education:[
          'SMS resmi BRI menggunakan shortcode 14017, bukan nomor HP biasa.',
          'Domain resmi BRI hanya bri.co.id — "bri-verif.me" adalah domain phishing.',
          'Bank tidak pernah mengirim link verifikasi via SMS — selalu login langsung ke app.',
          'SMS phishing (smishing) dikirim massal — lapor ke 159 (kominfo) atau bri.co.id/report.',
          'Jam pengiriman tengah malam adalah taktik agar korban panik dan tidak berpikir jernih.',
        ],
        phishIndicators:['Smishing','Domain spoofing','Fake shortcode','Pressure tactics','Off-hours timing'],
        avaHints:['BRI SMS resmi dari 14017, bukan nomor HP.','bri-verif.me bukan domain resmi.','Jam 2 malam? Red flag klasik smishing.'],
        clues:[
          {text:'Pengirim menggunakan nomor HP biasa, bukan shortcode bank'},
          {text:'Link mengarah ke domain yang bukan milik BRI'},
          {text:'Waktu pengiriman tidak wajar (dini hari)'},
        ],
        adaptiveHint:'Smishing (SMS phishing) makin canggih. Kunci utama: selalu cek shortcode dan domain resmi.',
      }
    ]
  },
  {
    id:'m7', type:'web', name:'WEBSITE FORENSICS PRO', icon:'🕵️',
    desc:'Analisis mendalam website mencurigakan: SSL certificate, WHOIS data, konten, dan perilaku halaman.',
    difficulty:'HARD', reward:220, xp:110, tags:['web','mal'],
    cases:[
      {
        id:'c9', type:'web',
        title:'Toko Online Palsu — Produk Viral',
        subtitle:'Website toko online yang viral tapi mencurigakan',
        artifact:{
          type:'website',
          url:'https://tokoonline-murah99.shop/promo-iphone',
          ssl:true,
          body:`🌐 WEBSITE ANALYSIS

URL: https://tokoonline-murah99.shop/promo-iphone
SSL: ✅ Ada (tapi self-signed, bukan CA terpercaya)

KONTEN HALAMAN:
┌─────────────────────────────────┐
│ 🔥 PROMO SPESIAL HARI INI!     │
│ iPhone 16 Pro MAX               │
│ Harga Normal: Rp 22.000.000    │
│ HARGA KAMU: Rp 2.999.000 !!   │
│ Diskon 86%!                    │
│                                 │
│ [BELI SEKARANG — STOK TERBATAS]│
│                                 │
│ ⚠️ Transfer via: Rekening      │
│ Pribadi a.n. Budi S. (BCA)     │
│ 3891-0282-XX                   │
└─────────────────────────────────┘

METADATA TEKNIS:
- Domain registrasi: 5 hari lalu (Namecheap)
- TLD: .shop (domain murah, sering disalahgunakan)
- WHOIS: Privacy protected (identitas tersembunyi)
- Payment: Transfer rekening pribadi (bukan payment gateway)
- Kontak: Hanya WA, tidak ada alamat fisik
- Foto produk: Reverse image search = diambil dari Google`,
        },
        indicators:[
          {icon:'💰',label:'Harga iPhone diskon 86% — tidak realistis',status:'DANGER',class:'ind-danger'},
          {icon:'🏦',label:'Pembayaran ke rekening pribadi (bukan payment gateway)',status:'DANGER',class:'ind-danger'},
          {icon:'📅',label:'Domain baru terdaftar 5 hari lalu',status:'DANGER',class:'ind-danger'},
          {icon:'🔒',label:'SSL self-signed, bukan dari CA terpercaya',status:'WARN',class:'ind-warn'},
          {icon:'📍',label:'Tidak ada alamat fisik atau nomor SIUP',status:'WARN',class:'ind-warn'},
          {icon:'📸',label:'Foto produk dicuri dari Google Images',status:'WARN',class:'ind-warn'},
        ],
        riskScore:96,isPhishing:true,correctVerdict:'report',
        education:[
          'Diskon lebih dari 50% untuk produk elektronik premium hampir selalu penipuan.',
          'Toko legitimate menggunakan payment gateway (Midtrans, Xendit) — bukan rekening pribadi.',
          'Domain .shop dan .xyz murah dan sering digunakan scammer untuk toko palsu.',
          'Self-signed SSL memberikan enkripsi tapi tidak memverifikasi identitas pemilik website.',
          'Cek legalitas toko online di siapbertugas.id atau kominfo.go.id sebelum transaksi.',
        ],
        phishIndicators:['Unrealistic discount','Personal account payment','New domain','Self-signed SSL','Stock photo theft'],
        avaHints:['Diskon 86% untuk iPhone = mustahil.','Transfer rekening pribadi = red flag utama toko palsu.','Domain 5 hari + .shop = classic online shop scam.'],
        clues:[
          {text:'Harga produk tidak realistis (diskon 86%)'},
          {text:'Pembayaran diminta ke rekening pribadi, bukan payment gateway'},
          {text:'Domain sangat baru (5 hari) dengan TLD murah (.shop)'},
          {text:'Tidak ada informasi bisnis yang dapat diverifikasi'},
        ],
        adaptiveHint:'Toko online palsu adalah modus penipuan terbesar di Indonesia. Selalu gunakan marketplace resmi.',
      }
    ]
  },
  {
    id:'m8', type:'scam', name:'ROMANCE SCAM CASE', icon:'💔',
    desc:'Deteksi romance scam dan investment fraud yang memanfaatkan hubungan emosional korban.',
    difficulty:'HARD', reward:240, xp:120, tags:['scam','social'],
    cases:[
      {
        id:'c10', type:'scam',
        title:'Laporan Romance Scam — Pig Butchering',
        subtitle:'Korban melaporkan dugaan penipuan berkedok perkenalan online',
        artifact:{
          type:'chat',
          sender:'Case Report — Investigasi Romance Scam',
          body:`📁 CASE REPORT #RS-2026-047

PELAPOR: Dewi (35 tahun, Jakarta)
MODUS: Pig Butchering Scam

KRONOLOGI:
1. Perkenalan via Instagram DM dari akun 
   "@james.lin.ceo" (foto tampan, 500+ koneksi)

2. Chatting intens selama 3 minggu, 
   membangun kepercayaan

3. Pelaku mengaku "sukses trading crypto" dan 
   menawarkan ajak investasi bersama di platform:
   http://tradingpro-asia.vip

4. Korban deposit pertama Rp 5 juta → profit 
   Rp 15 juta (palsu, hanya tampilan di dashboard)

5. Korban diyakinkan deposit lebih: Rp 150 juta

6. Saat mencoba withdraw → diminta bayar "pajak" 
   Rp 30 juta terlebih dahulu

7. Semua kontak terputus setelah pembayaran

ANALISIS PROFIL PELAKU:
- Foto profil: Reverse search = foto aktor Korea
- Akun IG dibuat 2 bulan lalu
- Klaim CEO tapi tidak bisa verifikasi perusahaan
- Bahasa Indonesia sedikit aneh (kemungkinan terjemahan)
- Selalu hindari video call langsung`,
        },
        indicators:[
          {icon:'❤️',label:'Love bombing cepat untuk bangun kepercayaan',status:'DANGER',class:'ind-danger'},
          {icon:'💰',label:'Profit palsu untuk umpan deposit lebih besar',status:'DANGER',class:'ind-danger'},
          {icon:'🌐',label:'Platform trading domain .vip (tidak terregulasi)',status:'DANGER',class:'ind-danger'},
          {icon:'📸',label:'Foto profil adalah foto orang lain (stolen identity)',status:'DANGER',class:'ind-danger'},
          {icon:'🚫',label:'Selalu menghindari video call langsung',status:'DANGER',class:'ind-danger'},
          {icon:'💸',label:'"Pajak withdraw" = tanda scam tambahan',status:'DANGER',class:'ind-danger'},
        ],
        riskScore:100,isPhishing:true,correctVerdict:'report',
        education:[
          'Pig Butchering Scam: korban "digemukkan" dengan profit palsu sebelum "disembelih" dengan deposit besar.',
          'Pelaku selalu menghindari video call — gunakan fitur filter video call di beberapa app untuk verifikasi.',
          'Platform investasi legal di Indonesia harus terdaftar di OJK (ojk.go.id/id/kanal/iknb/data-dan-statistik).',
          '"Pajak withdraw" adalah scam lanjutan — platform legal tidak meminta pajak di luar sistem.',
          'Laporkan romance scam ke Bareskrim Polri atau kominfo.go.id/content/detail/3303.',
        ],
        phishIndicators:['Pig butchering','Love bombing','Fake profit dashboard','Stolen identity','Video call avoidance','Fake withdrawal tax'],
        avaHints:['Pig butchering = umpan profit kecil untuk mancing lebih besar.','Selalu cek OJK untuk platform investasi legal.','Tidak mau video call = hampir pasti scammer.'],
        clues:[
          {text:'Pelaku membangun kedekatan emosional sangat cepat (love bombing)'},
          {text:'Profit awal tampak nyata tapi tidak bisa dicairkan tanpa biaya tambahan'},
          {text:'Foto profil adalah identitas curian (stolen identity)'},
          {text:'Platform tidak terdaftar di OJK dan menggunakan domain .vip'},
        ],
        adaptiveHint:'Romance scam menyerang sisi emosional. Jangan biarkan perasaan mengalahkan kewaspadaan dalam investasi.',
      }
    ]
  }
];

// Merge extra missions into DB
MISSIONS_DB.push(...EXTRA_MISSIONS);

/* ════════════════════════════════════
   NPC PANEL IN HUB
════════════════════════════════════ */
function renderNpcPanel() {
  const panel = document.getElementById('panel-npcs');
  if(!panel) return;
  panel.innerHTML = `
    <div class="section-header"><div class="section-title">NPC CONTACTS</div><div class="section-line"></div></div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:16px;">Bicara dengan NPC untuk mendapat informasi, tips, dan quest hint eksklusif.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      ${NPCS.map(npc=>`
        <div onclick="openNpc('${npc.id}')" style="background:var(--surface2);border:1px solid var(--border);padding:16px;cursor:pointer;transition:all 0.2s;display:flex;gap:12px;align-items:center;" onmouseover="this.style.borderColor='${npc.color}'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="font-size:32px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;border:1px solid ${npc.color};background:var(--bg2);">${npc.avatar}</div>
          <div>
            <div style="font-family:var(--hud);font-size:12px;color:${npc.color};letter-spacing:1px;">${npc.name}</div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px;">${npc.role}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:4px;">[ KLIK UNTUK BICARA ]</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ════════════════════════════════════
   INIT
════════════════════════════════════ */
/** Inline handlers in index.html require global bindings (ES module scope) */
function bindGlobals() {
  const api = {
    switchTab, selectAvatar, selectAvatar2, doLogin, doRegister,
    showPanel, filterMissions, goToZone, openAvaPanel, exportJSON, exportCSV,
    exitGameplay, switchGpTab, sendToAva, submitVerdict, nextCase,
    closeAva, sendAvaHub, learnSkill, buyItem, toggleClue,
    openNpc, nextNpcDialog, closeNpc, renderNpcPanel,
  };
  Object.assign(window, api);
}

document.addEventListener('DOMContentLoaded', () => {
  bindGlobals();
  localStorage.removeItem('cyberguard-session');
  addAvaHubMsg('Halo! Saya AVA, asisten virtual CyberGuard. Tanyakan apapun tentang ancaman siber kepada saya!');
  refreshServerConnection();
  startBoot();
});