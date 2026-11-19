import type { ConditionGrade, LanguageCode } from '../types/store.ts';

export const LANGUAGE_OPTIONS: { code: LanguageCode; shortLabel: string; label: string }[] = [
  { code: 'id', shortLabel: 'ID', label: 'Indonesia' },
  { code: 'en', shortLabel: 'EN', label: 'English' },
  { code: 'de', shortLabel: 'DE', label: 'Deutsch' },
  { code: 'fr', shortLabel: 'FR', label: 'Français' },
];

export interface TranslationBundle {
  nav: {
    collection: string;
    newArrivals: string;
    sale: string;
    about: string;
    admin: string;
    searchAria: string;
    account: string;
    signIn: string;
    cart: string;
    openCartAria: (count: number) => string;
    changeLangAria: string;
    accountOrders: string;
    signInOrUp: string;
    adminDashboard: string;
  };
  hero: {
    kicker: string;
    defaultTitle: string;
    defaultSubtitle: string;
    defaultCta: string;
    curationCta: string;
    demoNote: string;
    categoryKicker: string;
    defaultFeatured: string;
    viewAll: string;
    itemsCount: (count: number) => string;
    storyKicker: string;
    defaultAboutTitle: string;
    defaultAboutBody: string;
    quote: string;
    pillars: { code: string; title: string; body: string }[];
  };
  shop: {
    kicker: string;
    titleAll: string;
    titleNew: string;
    titleSale: string;
    titleCategoryFallback: string;
    showingCount: (count: number) => string;
    searchPlaceholder: string;
    allConditions: string;
    allStyles: string;
    sortNewest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    allFilter: string;
    onlyAvailable: string;
    reset: string;
    emptyTitle: string;
    emptyBody: string;
    emptyCta: string;
  };
  product: {
    backToCollection: string;
    notFoundTitle: string;
    notFoundBody: string;
    addToCart: string;
    outOfStock: string;
    sold: string;
    reserved: string;
    availableUnits: (count: number) => string;
    availabilityLabel: string;
    demoBadge: string;
    demoBanner: string;
    viewLabel: string;
    imageTypes: Record<string, string>;
    openDefectTitle: string;
    measurementsTitle: string;
    sizeLabel: string;
    styleLabel: string;
    colorLabel: string;
    materialLabel: string;
    materialFallback: string;
    chestWidth: string;
    length: string;
    shoulderWidth: string;
    sleeveLength: string;
    waist: string;
    inseam: string;
    bagWidth: string;
    bagHeight: string;
    shoeSize: string;
    curationNotes: string;
    saveWishlist: string;
    removeWishlist: string;
    grades: Record<ConditionGrade, { title: string; summary: string }>;
  };
  cart: {
    title: string;
    itemCount: (count: number) => string;
    emptyTitle: string;
    emptyBody: string;
    viewCollection: string;
    subtotal: string;
    serverNote: string;
    viewCart: string;
    checkout: string;
    proceedCheckout: string;
    insufficientStock: (avail: number) => string;
    sizeShort: string;
    qtyShort: string;
  };
  checkout: {
    kicker: string;
    heading: string;
    signInPromptTitle: string;
    signInPromptBody: string;
    signInGoogle: string;
    emptyTitle: string;
    emptyBody: string;
    demoNotice: string;
    addressSection: string;
    useNewAddress: string;
    recipientName: string;
    phone: string;
    addressLine: string;
    city: string;
    province: string;
    district: string;
    postalCode: string;
    notes: string;
    courierSection: string;
    estPrefix: string;
    summaryTitle: string;
    couponPlaceholder: string;
    apply: string;
    discount: string;
    shipping: string;
    total: string;
    submitOrder: string;
    submittingOrder: string;
    waCheckoutNote: (minutes: number) => string;
    orderLoginTitle: string;
    orderLoginBody: string;
    orderNotFound: string;
    viewOrderHistory: string;
    orderNumberLabel: string;
    createdAt: string;
    paymentLabel: string;
    fulfilmentLabel: string;
    waBoxTitle: string;
    waBoxDesc: (deadline: string) => string;
    waPayButton: string;
    copyMessage: string;
    copiedMessage: string;
    cancelOrder: string;
    cancelling: string;
    waPaidNotice: string;
    itemsSummary: string;
    shippingAddressTitle: string;
    courierLabel: string;
    trackingLabel: string;
    viewAllOrders: string;
    continueShopping: string;
  };
  chatAdmin: {
    fabLabel: string;
    title: string;
    subtitle: string;
    hours: string;
    quickTopicsLabel: string;
    topics: string[];
    messageLabel: string;
    placeholder: string;
    sendWhatsapp: string;
    copyText: string;
    copied: string;
  };
  footer: {
    description: string;
    colServices: string;
    allCollections: string;
    newArrivals: string;
    salePicks: string;
    faqAndGrades: string;
    colAbout: string;
    aboutUs: string;
    contactUs: string;
    shippingPackaging: string;
    returnsPolicy: string;
    privacyTerms: string;
    colStoreInfo: string;
    timezoneLabel: string;
    brandKit: string;
    adminPortal: string;
    copyright: string;
    currencyNote: string;
  };
  info: {
    aboutKicker: string;
    gradesHeading: string;
    contactKicker: string;
    contactHeading: string;
    contactIntro: string;
    handlingLabel: string;
    faqKicker: string;
    faqHeading: string;
    policies: Record<string, string>;
  };
  auth: {
    alreadySignedIn: string;
    openAdmin: string;
    openAccount: string;
    adminTitle: string;
    customerTitle: string;
    adminDesc: string;
    customerDesc: string;
    continueGoogle: string;
    firebaseNote: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationBundle> = {
  id: {
    nav: {
      collection: 'Koleksi',
      newArrivals: 'Baru Hadir',
      sale: 'Diskon',
      about: 'Cerita & Kurasi',
      admin: 'Admin',
      searchAria: 'Cari produk',
      account: 'Akun',
      signIn: 'Masuk',
      cart: 'Keranjang',
      openCartAria: (c) => `Buka keranjang belanja (${c} item)`,
      changeLangAria: 'Pilih bahasa',
      accountOrders: 'Akun & Pesanan Saya',
      signInOrUp: 'Masuk / Daftar',
      adminDashboard: 'Dashboard Admin',
    },
    hero: {
      kicker: 'Fashion Secondhand Terkurasi · Indonesia',
      defaultTitle: 'Temukan yang berharga. Rawat lebih lama.',
      defaultSubtitle:
        'Preluxes menghadirkan fashion secondhand terkurasi—tas, pakaian, sepatu, dan aksesori—dengan ukuran aktual, bahan yang diketahui, serta catatan kondisi yang jujur.',
      defaultCta: 'Jelajahi Koleksi',
      curationCta: 'Standar Kurasi & Kondisi',
      demoNote:
        'Catatan: Katalog yang tampil saat ini menggunakan data demonstrasi ilustratif hingga pengelola memublikasikan stok nyata di Firestore.',
      categoryKicker: 'Kategori Pilihan',
      defaultFeatured: 'Pilihan Terkurasi',
      viewAll: 'Lihat semua koleksi',
      itemsCount: (c) => `${c} pilihan`,
      storyKicker: 'Gagasan Preluxes',
      defaultAboutTitle: 'Cerita yang belum selesai',
      defaultAboutBody:
        'Ada barang yang selesai dipakai seseorang, tetapi masih punya tempat dalam hidup orang lain. Preluxes membuka ruang untuk pertemuan berikutnya—membantu Anda memilih dengan lebih sadar, mengenali kebutuhan, memakai yang dipilih, dan merawat sesuai materialnya.',
      quote: '“Bentuk klasik, ukuran praktis. Lihat detail dan kondisi pemakaiannya.”',
      pillars: [
        {
          code: '01. Kurasi',
          title: 'Bentuk, fungsi, dan kondisi',
          body: 'Setiap tas, pakaian, sepatu, dan aksesori diseleksi secara tunggal dengan pertimbangan kegunaan jangka panjang.',
        },
        {
          code: '02. Informasi',
          title: 'Ukuran aktual & kekurangan',
          body: 'Kami mencantumkan ukuran dalam sentimeter, bahan yang diketahui, serta catatan kekurangan pemakaian secara terbuka.',
        },
        {
          code: '03. Perawatan',
          title: 'Sesuai karakter material',
          body: 'Pemakaian kembali memperpanjang usia guna barang apabila dipilih sesuai kebutuhan dan dirawat dengan cara yang tepat.',
        },
        {
          code: '04. Layanan',
          title: 'Konfirmasi langsung via WhatsApp',
          body: 'Harga dalam Rupiah (IDR), reservasi stok otomatis saat checkout, dan konfirmasi pembayaran langsung dengan Admin via WhatsApp.',
        },
      ],
    },
    shop: {
      kicker: 'Katalog Preluxes',
      titleAll: 'Semua Koleksi',
      titleNew: 'Baru Hadir di Rak',
      titleSale: 'Pilihan Harga Khusus',
      titleCategoryFallback: 'Kategori',
      showingCount: (c) => `Menampilkan ${c} pilihan · Harga dalam IDR`,
      searchPlaceholder: 'Cari nama barang, bahan, warna, atau SKU...',
      allConditions: 'Semua Kondisi',
      allStyles: 'Semua Gaya',
      sortNewest: 'Terbaru Ditambahkan',
      sortPriceAsc: 'Harga: Terendah ke Tertinggi',
      sortPriceDesc: 'Harga: Tertinggi ke Terendah',
      allFilter: 'Semua',
      onlyAvailable: 'Hanya stok tersedia',
      reset: 'Reset',
      emptyTitle: 'Tidak ada produk yang cocok',
      emptyBody: 'Coba ubah kata kunci pencarian atau hapus sebagian filter kategori dan kondisi.',
      emptyCta: 'Tampilkan Semua Koleksi',
    },
    product: {
      backToCollection: 'Kembali ke Koleksi',
      notFoundTitle: 'Produk tidak ditemukan',
      notFoundBody: 'Barang mungkin telah diarsipkan atau tautan sudah berubah.',
      addToCart: 'Tambah ke Keranjang',
      outOfStock: 'Tidak Tersedia',
      sold: 'Sudah Terjual',
      reserved: 'Sedang Dipesan Pembeli Lain',
      availableUnits: (c) => `Tersedia (${c} unit unik)`,
      availabilityLabel: 'Ketersediaan',
      demoBadge: 'Demo',
      demoBanner: 'Data Demonstrasi — Item ilustratif untuk memperlihatkan halaman produk Preluxes.',
      viewLabel: 'Tampilan',
      imageTypes: {
        front: 'Depan',
        back: 'Belakang',
        detail: 'Detail',
        label: 'Label',
        defect: 'Kekurangan',
      },
      openDefectTitle: 'Catatan Kekurangan Terbuka:',
      measurementsTitle: 'Ukuran Aktual & Detail Material',
      sizeLabel: 'Label Ukuran',
      styleLabel: 'Kategori / Gaya',
      colorLabel: 'Warna',
      materialLabel: 'Bahan',
      materialFallback: 'Tidak tercantum pada label',
      chestWidth: 'Lebar Dada',
      length: 'Panjang',
      shoulderWidth: 'Lebar Bahu',
      sleeveLength: 'Panjang Lengan',
      waist: 'Lingkar Pinggang',
      inseam: 'Inseam',
      bagWidth: 'Lebar Tas',
      bagHeight: 'Tinggi Tas',
      shoeSize: 'Ukuran Sepatu',
      curationNotes: 'Catatan Kurasi',
      saveWishlist: 'Simpan ke wishlist',
      removeWishlist: 'Hapus dari wishlist',
      grades: {
        A: { title: 'Grade A — Seperti Baru', summary: 'Hampir tidak tampak tanda pemakaian; detail dan struktur sangat terjaga.' },
        B: { title: 'Grade B — Sangat Baik', summary: 'Tanda pemakaian ringan dan wajar, terawat rapi tanpa kekurangan fungsional.' },
        C: { title: 'Grade C — Baik', summary: 'Tanda pemakaian terlihat jelas dan dicatat secara terbuka pada deskripsi.' },
        D: { title: 'Grade D — Layak Pakai', summary: 'Memiliki keausan atau kekurangan spesifik yang didokumentasikan dengan foto.' },
      },
    },
    cart: {
      title: 'Keranjang Belanja',
      itemCount: (c) => `${c} pilihan item`,
      emptyTitle: 'Keranjang Anda masih kosong',
      emptyBody: 'Temukan tas, pakaian, sepatu, dan aksesori yang siap untuk pemakaian berikutnya.',
      viewCollection: 'Lihat Koleksi',
      subtotal: 'Subtotal',
      serverNote: 'Ongkos kirim dan validasi akhir stok dihitung di server sebelum konfirmasi WhatsApp.',
      viewCart: 'Lihat Keranjang',
      checkout: 'Checkout',
      proceedCheckout: 'Lanjut ke Checkout',
      insufficientStock: (a) => `Stok saat ini tidak mencukupi (${a} tersedia).`,
      sizeShort: 'Ukuran',
      qtyShort: 'Jumlah',
    },
    checkout: {
      kicker: 'Checkout WhatsApp',
      heading: 'Alamat, Pengiriman & Konfirmasi WhatsApp',
      signInPromptTitle: 'Masuk untuk melanjutkan checkout',
      signInPromptBody: 'Akun diperlukan agar pesanan, reservasi stok unik, serta pelacakan resi tercatat aman pada profil Anda.',
      signInGoogle: 'Masuk dengan Google',
      emptyTitle: 'Keranjang belanja masih kosong',
      emptyBody: 'Pilih barang terlebih dahulu sebelum melanjutkan ke konfirmasi pesanan.',
      demoNotice: 'Catatan Demonstrasi: Item demonstrasi belum disinkronkan ke Firestore. Jika Anda Admin, buka Dashboard Admin lalu klik Seed Data Demonstrasi ke Firestore agar reservasi stok dapat diuji.',
      addressSection: '1. Alamat Penerima',
      useNewAddress: 'Gunakan alamat baru',
      recipientName: 'Nama Penerima *',
      phone: 'Nomor Telepon / WhatsApp *',
      addressLine: 'Alamat Lengkap *',
      city: 'Kota / Kabupaten *',
      province: 'Provinsi *',
      district: 'Kecamatan',
      postalCode: 'Kode Pos *',
      notes: 'Catatan Pengiriman (Opsional)',
      courierSection: '2. Opsi Pengiriman',
      estPrefix: 'Estimasi',
      summaryTitle: 'Ringkasan Pesanan',
      couponPlaceholder: 'Kode kupon (mis. PRELUXES10)',
      apply: 'Terapkan',
      discount: 'Diskon',
      shipping: 'Ongkos Kirim',
      total: 'Total Pembayaran',
      submitOrder: 'Buat Pesanan & Bayar via WhatsApp',
      submittingOrder: 'Mereservasi Stok & Membuat Pesanan...',
      waCheckoutNote: (m) => `Pembayaran dilakukan langsung melalui chat WhatsApp dengan Admin Preluxes. Stok unik direservasi selama ${m} menit setelah pesanan dibuat.`,
      orderLoginTitle: 'Masuk untuk melihat pesanan',
      orderLoginBody: 'Detail pesanan dilindungi agar hanya pemilik akun yang dapat mengakses informasi pengiriman.',
      orderNotFound: 'Pesanan tidak ditemukan',
      viewOrderHistory: 'Lihat Riwayat Pesanan',
      orderNumberLabel: 'Nomor Pesanan',
      createdAt: 'Dibuat pada',
      paymentLabel: 'Pembayaran',
      fulfilmentLabel: 'Pengiriman',
      waBoxTitle: 'Konfirmasi & Pembayaran via WhatsApp Admin',
      waBoxDesc: (d) => `Stok unik telah direservasi hingga ${d}. Klik tombol di bawah untuk mengirim detail pesanan ini ke WhatsApp Admin dan menerima instruksi transfer/QRIS.`,
      waPayButton: 'Bayar & Konfirmasi via WhatsApp',
      copyMessage: 'Salin Pesan Pesanan',
      copiedMessage: 'Pesan disalin!',
      cancelOrder: 'Batalkan Pesanan (Lepas Stok)',
      cancelling: 'Membatalkan...',
      waPaidNotice: 'Pembayaran telah diverifikasi oleh Admin. Pesanan Anda sedang disiapkan untuk pengiriman.',
      itemsSummary: 'Ringkasan Produk',
      shippingAddressTitle: 'Alamat Pengiriman',
      courierLabel: 'Kurir',
      trackingLabel: 'No. Resi',
      viewAllOrders: 'Lihat Semua Pesanan Saya',
      continueShopping: 'Lanjut Belanja',
    },
    chatAdmin: {
      fabLabel: 'Chat Admin',
      title: 'Chat Admin Preluxes',
      subtitle: 'Tanya stok, ukuran aktual, atau konfirmasi pembayaran via WhatsApp.',
      hours: 'Operasional WIB (Asia/Jakarta)',
      quickTopicsLabel: 'Pilih topik cepat',
      topics: [
        'Tanya detail ukuran & kondisi barang',
        'Konfirmasi pembayaran pesanan',
        'Cek pengiriman & nomor resi',
      ],
      messageLabel: 'Pesan untuk Admin',
      placeholder: 'Tulis pertanyaan Anda di sini...',
      sendWhatsapp: 'Buka Chat WhatsApp',
      copyText: 'Salin Pesan',
      copied: 'Tersalin',
    },
    footer: {
      description: 'Marketplace fashion secondhand terkurasi—tas, pakaian, sepatu, dan aksesori dengan detail kondisi serta ukuran aktual yang jelas.',
      colServices: 'Kurasi & Layanan',
      allCollections: 'Semua Koleksi',
      newArrivals: 'Baru Hadir',
      salePicks: 'Pilihan Diskon',
      faqAndGrades: 'FAQ & Standar Kondisi',
      colAbout: 'Tentang & Kebijakan',
      aboutUs: 'Tentang Preluxes',
      contactUs: 'Kontak Kami',
      shippingPackaging: 'Pengiriman & Pengemasan',
      returnsPolicy: 'Kebijakan Pengembalian',
      privacyTerms: 'Privasi & Syarat Ketentuan',
      colStoreInfo: 'Informasi Toko',
      timezoneLabel: 'Zona Waktu',
      brandKit: 'Brand Kit & Aset Agency',
      adminPortal: 'Portal Pengelola Toko (Admin)',
      copyright: 'Single-Owner Curated Secondhand Store.',
      currencyNote: 'Mata uang IDR · Waktu Asia/Jakarta (WIB)',
    },
    info: {
      aboutKicker: 'Tentang Preluxes',
      gradesHeading: 'Skala Penilaian Kondisi Barang',
      contactKicker: 'Layanan Pelanggan',
      contactHeading: 'Kontak Preluxes',
      contactIntro: 'Pertanyaan seputar ukuran aktual, detail kondisi, atau konfirmasi pembayaran dapat disampaikan langsung melalui WhatsApp atau kanal berikut:',
      handlingLabel: 'Waktu Penanganan',
      faqKicker: 'Bantuan',
      faqHeading: 'Pertanyaan yang Sering Diajukan',
      policies: {
        shipping: 'Kebijakan Pengiriman',
        returns: 'Kebijakan Pengembalian & Retur',
        cancellation: 'Kebijakan Pembatalan',
        privacy: 'Kebijakan Privasi',
        terms: 'Syarat & Ketentuan',
      },
    },
    auth: {
      alreadySignedIn: 'Anda sudah masuk',
      openAdmin: 'Buka Dashboard Admin',
      openAccount: 'Buka Akun Pelanggan',
      adminTitle: 'Masuk Pengelola Toko',
      customerTitle: 'Masuk ke Akun Preluxes',
      adminDesc: 'Akses terbatas hanya untuk pemilik toko dan administrator terotorisasi.',
      customerDesc: 'Simpan alamat pengiriman, kelola wishlist, dan pantau status pesanan serta nomor resi Anda.',
      continueGoogle: 'Lanjutkan dengan Google',
      firebaseNote: 'Autentikasi dikelola aman melalui Firebase Authentication.',
    },
  },
  en: {
    nav: {
      collection: 'Collection',
      newArrivals: 'New Arrivals',
      sale: 'Sale',
      about: 'Story & Curation',
      admin: 'Admin',
      searchAria: 'Search products',
      account: 'Account',
      signIn: 'Sign In',
      cart: 'Cart',
      openCartAria: (c) => `Open shopping cart (${c} items)`,
      changeLangAria: 'Change language',
      accountOrders: 'My Account & Orders',
      signInOrUp: 'Sign In / Register',
      adminDashboard: 'Admin Dashboard',
    },
    hero: {
      kicker: 'Curated Secondhand Fashion · Indonesia',
      defaultTitle: 'Find what endures. Care for it longer.',
      defaultSubtitle:
        'Preluxes curates secondhand fashion—bags, apparel, shoes, and accessories—with exact cm measurements, known materials, and honest condition notes.',
      defaultCta: 'Explore Collection',
      curationCta: 'Curation & Condition Guide',
      demoNote:
        'Note: The catalog currently displays illustrative demonstration data until the store owner publishes live inventory in Firestore.',
      categoryKicker: 'Curated Categories',
      defaultFeatured: 'Curated Picks',
      viewAll: 'View all pieces',
      itemsCount: (c) => `${c} pieces`,
      storyKicker: 'The Preluxes Idea',
      defaultAboutTitle: 'Stories still unfolding',
      defaultAboutBody:
        'Some pieces finish one chapter only to belong in someone else’s wardrobe. Preluxes creates space for that next meeting—helping you choose mindfully, know exact fit, and care for materials properly.',
      quote: '“Classic silhouettes, practical measurements. Inspect every detail and wear note.”',
      pillars: [
        {
          code: '01. Curation',
          title: 'Form, function, and longevity',
          body: 'Every bag, garment, pair of shoes, and accessory is handpicked individually for lasting everyday utility.',
        },
        {
          code: '02. Transparency',
          title: 'Exact measurements & wear notes',
          body: 'We list garment dimensions in centimeters, known fabric composition, and honest wear disclosures upfront.',
        },
        {
          code: '03. Care',
          title: 'Material-conscious upkeep',
          body: 'Reuse extends a piece’s lifespan when chosen intentionally and maintained according to its natural fibers or leather.',
        },
        {
          code: '04. Service',
          title: 'Direct WhatsApp payment confirmation',
          body: 'Priced in IDR with atomic stock reservation at checkout and personal confirmation directly via WhatsApp Admin.',
        },
      ],
    },
    shop: {
      kicker: 'Preluxes Catalog',
      titleAll: 'All Pieces',
      titleNew: 'New Arrivals',
      titleSale: 'Special Value Picks',
      titleCategoryFallback: 'Category',
      showingCount: (c) => `Showing ${c} pieces · Prices in IDR`,
      searchPlaceholder: 'Search item name, fabric, color, or SKU...',
      allConditions: 'All Conditions',
      allStyles: 'All Styles',
      sortNewest: 'Newest First',
      sortPriceAsc: 'Price: Low to High',
      sortPriceDesc: 'Price: High to Low',
      allFilter: 'All',
      onlyAvailable: 'In stock only',
      reset: 'Reset',
      emptyTitle: 'No matching pieces found',
      emptyBody: 'Try adjusting your search keywords or clearing category and condition filters.',
      emptyCta: 'Show All Pieces',
    },
    product: {
      backToCollection: 'Back to Collection',
      notFoundTitle: 'Piece not found',
      notFoundBody: 'This item may have been archived or the link has changed.',
      addToCart: 'Add to Cart',
      outOfStock: 'Unavailable',
      sold: 'Sold Out',
      reserved: 'Reserved by Another Buyer',
      availableUnits: (c) => `Available (${c} unique piece)`,
      availabilityLabel: 'Availability',
      demoBadge: 'Demo',
      demoBanner: 'Demonstration Data — Illustrative item showcasing the Preluxes product page.',
      viewLabel: 'View',
      imageTypes: {
        front: 'Front',
        back: 'Back',
        detail: 'Detail',
        label: 'Label',
        defect: 'Wear Note',
      },
      openDefectTitle: 'Open Wear Disclosure:',
      measurementsTitle: 'Actual Measurements & Material',
      sizeLabel: 'Tag Size',
      styleLabel: 'Style / Fit',
      colorLabel: 'Color',
      materialLabel: 'Material',
      materialFallback: 'Not stated on care tag',
      chestWidth: 'Chest Width',
      length: 'Length',
      shoulderWidth: 'Shoulder Width',
      sleeveLength: 'Sleeve Length',
      waist: 'Waist',
      inseam: 'Inseam',
      bagWidth: 'Bag Width',
      bagHeight: 'Bag Height',
      shoeSize: 'Shoe Size',
      curationNotes: 'Curation Notes',
      saveWishlist: 'Save to wishlist',
      removeWishlist: 'Remove from wishlist',
      grades: {
        A: { title: 'Grade A — Like New', summary: 'Minimal to no visible signs of wear; structure and details intact.' },
        B: { title: 'Grade B — Very Good', summary: 'Light, natural signs of previous wear with no functional defects.' },
        C: { title: 'Grade C — Good', summary: 'Visible wear openly documented in notes and detail photos.' },
        D: { title: 'Grade D — Wearable', summary: 'Noticeable wear or specific flaws disclosed clearly with photos.' },
      },
    },
    cart: {
      title: 'Shopping Cart',
      itemCount: (c) => `${c} selected item(s)`,
      emptyTitle: 'Your shopping cart is empty',
      emptyBody: 'Browse curated bags, apparel, footwear, and accessories with transparent condition notes.',
      viewCollection: 'Browse Collection',
      subtotal: 'Subtotal',
      serverNote: 'Shipping and final stock validation are calculated on the server before WhatsApp confirmation.',
      viewCart: 'View Cart',
      checkout: 'Checkout',
      proceedCheckout: 'Proceed to Checkout',
      insufficientStock: (a) => `Insufficient stock (${a} available).`,
      sizeShort: 'Size',
      qtyShort: 'Qty',
    },
    checkout: {
      kicker: 'WhatsApp Checkout',
      heading: 'Shipping & WhatsApp Order Confirmation',
      signInPromptTitle: 'Sign in to continue checkout',
      signInPromptBody: 'An account ensures your order, unique stock reservation, and shipment tracking stay linked to your profile.',
      signInGoogle: 'Sign in with Google',
      emptyTitle: 'Your cart is empty',
      emptyBody: 'Please select at least one piece before proceeding to checkout.',
      demoNotice: 'Demonstration Notice: Demo items are not synced to Firestore yet. As Admin, open the Admin Dashboard and click Seed Data Demonstrasi to test live Firestore stock reservation.',
      addressSection: '1. Recipient Address',
      useNewAddress: 'Use a new address',
      recipientName: 'Recipient Name *',
      phone: 'Phone / WhatsApp Number *',
      addressLine: 'Street Address *',
      city: 'City / Regency *',
      province: 'Province *',
      district: 'District',
      postalCode: 'Postal Code *',
      notes: 'Delivery Notes (Optional)',
      courierSection: '2. Shipping Courier',
      estPrefix: 'Est.',
      summaryTitle: 'Order Summary',
      couponPlaceholder: 'Coupon code (e.g. PRELUXES10)',
      apply: 'Apply',
      discount: 'Discount',
      shipping: 'Shipping',
      total: 'Grand Total',
      submitOrder: 'Place Order & Pay via WhatsApp',
      submittingOrder: 'Reserving Stock & Creating Order...',
      waCheckoutNote: (m) => `Payment is completed via WhatsApp Chat directly with Preluxes Admin. Unique stock is reserved for ${m} minutes.`,
      orderLoginTitle: 'Sign in to view order',
      orderLoginBody: 'Order details are protected so only the account owner can view shipping details.',
      orderNotFound: 'Order not found',
      viewOrderHistory: 'View Order History',
      orderNumberLabel: 'Order Number',
      createdAt: 'Placed on',
      paymentLabel: 'Payment',
      fulfilmentLabel: 'Fulfilment',
      waBoxTitle: 'Complete Payment via WhatsApp Admin Chat',
      waBoxDesc: (d) => `Your unique item stock is reserved until ${d}. Send your order summary to our Admin on WhatsApp to receive bank transfer / QRIS details.`,
      waPayButton: 'Chat & Pay on WhatsApp',
      copyMessage: 'Copy Order Message',
      copiedMessage: 'Copied!',
      cancelOrder: 'Cancel Order (Release Stock)',
      cancelling: 'Cancelling...',
      waPaidNotice: 'Payment has been verified by Admin. Your order is now being prepared for shipment.',
      itemsSummary: 'Item Summary',
      shippingAddressTitle: 'Shipping Address',
      courierLabel: 'Courier',
      trackingLabel: 'Tracking No.',
      viewAllOrders: 'View All My Orders',
      continueShopping: 'Continue Shopping',
    },
    chatAdmin: {
      fabLabel: 'Chat Admin',
      title: 'Chat with Preluxes Admin',
      subtitle: 'Ask about measurements, condition details, or confirm WhatsApp payment.',
      hours: 'Operating Hours: WIB (Asia/Jakarta)',
      quickTopicsLabel: 'Quick topics',
      topics: [
        'Ask about sizing & condition',
        'Confirm order payment',
        'Check shipping & tracking',
      ],
      messageLabel: 'Message to Admin',
      placeholder: 'Write your question here...',
      sendWhatsapp: 'Open WhatsApp Chat',
      copyText: 'Copy Message',
      copied: 'Copied',
    },
    footer: {
      description: 'Curated secondhand fashion marketplace—bags, apparel, shoes, and accessories with transparent condition notes and exact measurements.',
      colServices: 'Curation & Service',
      allCollections: 'All Collections',
      newArrivals: 'New Arrivals',
      salePicks: 'Special Value',
      faqAndGrades: 'FAQ & Condition Guide',
      colAbout: 'About & Policies',
      aboutUs: 'About Preluxes',
      contactUs: 'Contact Us',
      shippingPackaging: 'Shipping & Packaging',
      returnsPolicy: 'Return Policy',
      privacyTerms: 'Privacy & Terms',
      colStoreInfo: 'Store Information',
      timezoneLabel: 'Timezone',
      brandKit: 'Brand Kit & Agency Assets',
      adminPortal: 'Store Manager Portal (Admin)',
      copyright: 'Single-Owner Curated Secondhand Store.',
      currencyNote: 'Currency IDR · Asia/Jakarta (WIB)',
    },
    info: {
      aboutKicker: 'About Preluxes',
      gradesHeading: 'Condition Grading Scale',
      contactKicker: 'Customer Care',
      contactHeading: 'Contact Preluxes',
      contactIntro: 'Questions regarding measurements, condition notes, or payment confirmation can be sent via WhatsApp or the channels below:',
      handlingLabel: 'Handling Time',
      faqKicker: 'Help',
      faqHeading: 'Frequently Asked Questions',
      policies: {
        shipping: 'Shipping Policy',
        returns: 'Returns & Refunds',
        cancellation: 'Cancellation Policy',
        privacy: 'Privacy Policy',
        terms: 'Terms & Conditions',
      },
    },
    auth: {
      alreadySignedIn: 'You are signed in',
      openAdmin: 'Open Admin Dashboard',
      openAccount: 'Open Customer Account',
      adminTitle: 'Store Manager Sign In',
      customerTitle: 'Sign in to Preluxes',
      adminDesc: 'Restricted access for authorized store owner and administrators.',
      customerDesc: 'Save shipping addresses, manage your wishlist, and track orders and tracking numbers.',
      continueGoogle: 'Continue with Google',
      firebaseNote: 'Authentication is securely handled via Firebase Authentication.',
    },
  },
  de: {
    nav: {
      collection: 'Kollektion',
      newArrivals: 'Neuheiten',
      sale: 'Angebote',
      about: 'Über uns',
      admin: 'Admin',
      searchAria: 'Produkte suchen',
      account: 'Konto',
      signIn: 'Anmelden',
      cart: 'Warenkorb',
      openCartAria: (c) => `Warenkorb öffnen (${c} Artikel)`,
      changeLangAria: 'Sprache wählen',
      accountOrders: 'Konto & Bestellungen',
      signInOrUp: 'Anmelden / Registrieren',
      adminDashboard: 'Admin-Dashboard',
    },
    hero: {
      kicker: 'Kuratierte Secondhand-Mode · Indonesien',
      defaultTitle: 'Wertvolles entdecken. Länger pflegen.',
      defaultSubtitle:
        'Preluxes präsentiert kuratierte Secondhand-Mode — Taschen, Kleidung, Schuhe und Accessoires — mit exakten Zentimetermaßen, Materialangaben und ehrlichen Zustandsnotizen.',
      defaultCta: 'Kollektion entdecken',
      curationCta: 'Kurations- & Zustandsstandard',
      demoNote:
        'Hinweis: Der Katalog zeigt derzeit illustrative Demodaten, bis der Store-Inhaber reale Bestände in Firestore veröffentlicht.',
      categoryKicker: 'Ausgewählte Kategorien',
      defaultFeatured: 'Kuratierte Auswahl',
      viewAll: 'Alle Stücke ansehen',
      itemsCount: (c) => `${c} Artikel`,
      storyKicker: 'Die Idee von Preluxes',
      defaultAboutTitle: 'Geschichten, die weitergehen',
      defaultAboutBody:
        'Manche Stücke beenden ein Kapitel und finden in einer neuen Garderobe ihren Platz. Preluxes schafft Raum für diese nächste Begegnung — bewusst auswählen und passend zum Material pflegen.',
      quote: '„Klassische Formen, präzise Maße. Entdecken Sie jedes Detail und den Zustand.“',
      pillars: [
        {
          code: '01. Kuration',
          title: 'Form, Funktion & Bestand',
          body: 'Jede Tasche, jedes Kleidungsstück, jedes Paar Schuhe und Accessoire wird einzeln auf Langlebigkeit geprüft.',
        },
        {
          code: '02. Transparenz',
          title: 'Echte Maße & Gebrauchsspuren',
          body: 'Wir nennen exakte Maße in Zentimetern, bekannte Materialien sowie alle Tragespuren offen im Detail.',
        },
        {
          code: '03. Pflege',
          title: 'Materialgerechte Erhaltung',
          body: 'Wiederverwendung verlängert die Lebensdauer hochwertiger Stücke durch bewusste Pflege.',
        },
        {
          code: '04. Service',
          title: 'Zahlung direkt per WhatsApp',
          body: 'Preise in IDR, automatische Bestandsreservierung beim Checkout und persönliche Bestätigung per WhatsApp-Admin.',
        },
      ],
    },
    shop: {
      kicker: 'Preluxes Katalog',
      titleAll: 'Gesamte Kollektion',
      titleNew: 'Neu eingetroffen',
      titleSale: 'Sonderpreise',
      titleCategoryFallback: 'Kategorie',
      showingCount: (c) => `${c} Artikel angezeigt · Preise in IDR`,
      searchPlaceholder: 'Name, Material, Farbe oder SKU suchen...',
      allConditions: 'Alle Zustände',
      allStyles: 'Alle Stile',
      sortNewest: 'Neueste zuerst',
      sortPriceAsc: 'Preis: Aufsteigend',
      sortPriceDesc: 'Preis: Absteigend',
      allFilter: 'Alle',
      onlyAvailable: 'Nur verfügbare Artikel',
      reset: 'Zurücksetzen',
      emptyTitle: 'Keine passenden Artikel gefunden',
      emptyBody: 'Passen Sie Ihre Suchbegriffe an oder setzen Sie die Filter zurück.',
      emptyCta: 'Alle Artikel anzeigen',
    },
    product: {
      backToCollection: 'Zurück zur Kollektion',
      notFoundTitle: 'Artikel nicht gefunden',
      notFoundBody: 'Dieser Artikel wurde möglicherweise archiviert oder der Link hat sich geändert.',
      addToCart: 'In den Warenkorb',
      outOfStock: 'Nicht verfügbar',
      sold: 'Verkauft',
      reserved: 'Für anderen Käufer reserviert',
      availableUnits: (c) => `Verfügbar (${c} Einzelstück)`,
      availabilityLabel: 'Verfügbarkeit',
      demoBadge: 'Demo',
      demoBanner: 'Demodaten — Beispielartikel zur Darstellung der Preluxes-Produktseite.',
      viewLabel: 'Ansicht',
      imageTypes: {
        front: 'Vorne',
        back: 'Hinten',
        detail: 'Detail',
        label: 'Etikett',
        defect: 'Makel',
      },
      openDefectTitle: 'Offene Hinweise zu Gebrauchsspuren:',
      measurementsTitle: 'Tatsächliche Maße & Material',
      sizeLabel: 'Größenangabe',
      styleLabel: 'Kategorie / Stil',
      colorLabel: 'Farbe',
      materialLabel: 'Material',
      materialFallback: 'Nicht auf dem Etikett angegeben',
      chestWidth: 'Brustweite',
      length: 'Länge',
      shoulderWidth: 'Schulterbreite',
      sleeveLength: 'Ärmellänge',
      waist: 'Taillenumfang',
      inseam: 'Schrittlänge',
      bagWidth: 'Taschenbreite',
      bagHeight: 'Taschenhöhe',
      shoeSize: 'Schuhgröße',
      curationNotes: 'Kurationsnotizen',
      saveWishlist: 'Auf die Wunschliste',
      removeWishlist: 'Von Wunschliste entfernen',
      grades: {
        A: { title: 'Note A — Wie neu', summary: 'Kaum sichtbare Gebrauchsspuren; Struktur und Details hervorragend.' },
        B: { title: 'Note B — Sehr gut', summary: 'Leichte, normale Gebrauchsspuren ohne funktionale Mängel.' },
        C: { title: 'Note C — Gut', summary: 'Deutliche Gebrauchsspuren offen beschrieben und fotografiert.' },
        D: { title: 'Note D — Tragbar', summary: 'Spezifische Abnutzung oder Makel transparent dokumentiert.' },
      },
    },
    cart: {
      title: 'Warenkorb',
      itemCount: (c) => `${c} ausgewählte Artikel`,
      emptyTitle: 'Ihr Warenkorb ist noch leer',
      emptyBody: 'Entdecken Sie kuratierte Taschen, Kleidung, Schuhe und Accessoires.',
      viewCollection: 'Kollektion ansehen',
      subtotal: 'Zwischensumme',
      serverNote: 'Versandkosten und Bestandsprüfung werden vor der WhatsApp-Bestätigung serverseitig berechnet.',
      viewCart: 'Warenkorb ansehen',
      checkout: 'Zur Kasse',
      proceedCheckout: 'Weiter zur Kasse',
      insufficientStock: (a) => `Aktueller Bestand reicht nicht aus (${a} verfügbar).`,
      sizeShort: 'Größe',
      qtyShort: 'Menge',
    },
    checkout: {
      kicker: 'WhatsApp Checkout',
      heading: 'Lieferadresse & WhatsApp-Bestätigung',
      signInPromptTitle: 'Für den Checkout anmelden',
      signInPromptBody: 'Ein Konto sorgt dafür, dass Bestellung, Bestandsreservierung und Sendungsverfolgung sicher gespeichert werden.',
      signInGoogle: 'Mit Google anmelden',
      emptyTitle: 'Ihr Warenkorb ist leer',
      emptyBody: 'Bitte wählen Sie mindestens einen Artikel aus.',
      demoNotice: 'Demo-Hinweis: Demo-Artikel sind noch nicht in Firestore gespeichert. Als Admin können Sie im Dashboard „Seed Data Demonstrasi“ ausführen.',
      addressSection: '1. Lieferadresse',
      useNewAddress: 'Neue Adresse verwenden',
      recipientName: 'Empfängername *',
      phone: 'Telefon / WhatsApp *',
      addressLine: 'Vollständige Adresse *',
      city: 'Stadt / Bezirk *',
      province: 'Provinz *',
      district: 'Ortsteil',
      postalCode: 'Postleitzahl *',
      notes: 'Lieferhinweise (Optional)',
      courierSection: '2. Versandoptionen',
      estPrefix: 'Lieferzeit ca.',
      summaryTitle: 'Bestellübersicht',
      couponPlaceholder: 'Gutscheincode (z.B. PRELUXES10)',
      apply: 'Einlösen',
      discount: 'Rabatt',
      shipping: 'Versandkosten',
      total: 'Gesamtbetrag',
      submitOrder: 'Bestellen & per WhatsApp bezahlen',
      submittingOrder: 'Bestand wird reserviert...',
      waCheckoutNote: (m) => `Die Zahlung erfolgt direkt im WhatsApp-Chat mit dem Preluxes-Admin. Das Einzelstück ist ${m} Minuten reserviert.`,
      orderLoginTitle: 'Anmelden, um Bestellung anzuzeigen',
      orderLoginBody: 'Bestelldaten sind geschützt und nur für den Kontoinhaber sichtbar.',
      orderNotFound: 'Bestellung nicht gefunden',
      viewOrderHistory: 'Bestellverlauf ansehen',
      orderNumberLabel: 'Bestellnummer',
      createdAt: 'Erstellt am',
      paymentLabel: 'Zahlung',
      fulfilmentLabel: 'Versandstatus',
      waBoxTitle: 'Zahlung per WhatsApp-Chat abschließen',
      waBoxDesc: (d) => `Ihr Einzelstück ist bis ${d} reserviert. Senden Sie die Bestellübersicht an unseren Admin per WhatsApp für die Zahlungsdaten.`,
      waPayButton: 'Per WhatsApp bestätigen & zahlen',
      copyMessage: 'Nachricht kopieren',
      copiedMessage: 'Kopiert!',
      cancelOrder: 'Bestellung stornieren (Bestand freigeben)',
      cancelling: 'Wird storniert...',
      waPaidNotice: 'Zahlung vom Admin bestätigt. Ihre Bestellung wird nun für den Versand vorbereitet.',
      itemsSummary: 'Artikelübersicht',
      shippingAddressTitle: 'Lieferadresse',
      courierLabel: 'Versanddienst',
      trackingLabel: 'Sendungsnr.',
      viewAllOrders: 'Alle Bestellungen ansehen',
      continueShopping: 'Weiter einkaufen',
    },
    chatAdmin: {
      fabLabel: 'Chat Admin',
      title: 'Chat mit Preluxes Admin',
      subtitle: 'Fragen zu Maßen, Zustand oder Zahlungsbestätigung per WhatsApp.',
      hours: 'Servicezeit: WIB (Asia/Jakarta)',
      quickTopicsLabel: 'Schnellauswahl',
      topics: [
        'Frage zu Größe & Zustand',
        'Zahlung bestätigen',
        'Versandstatus prüfen',
      ],
      messageLabel: 'Nachricht an Admin',
      placeholder: 'Ihre Nachricht hier eingeben...',
      sendWhatsapp: 'WhatsApp-Chat öffnen',
      copyText: 'Text kopieren',
      copied: 'Kopiert',
    },
    footer: {
      description: 'Kuratierter Secondhand-Modemarktplatz — Taschen, Kleidung, Schuhe und Accessoires mit klaren Zustandsnotizen und echten Maßen.',
      colServices: 'Kuration & Service',
      allCollections: 'Alle Kollektionen',
      newArrivals: 'Neuheiten',
      salePicks: 'Angebote',
      faqAndGrades: 'FAQ & Zustandsstandard',
      colAbout: 'Über uns & Richtlinien',
      aboutUs: 'Über Preluxes',
      contactUs: 'Kontakt',
      shippingPackaging: 'Versand & Verpackung',
      returnsPolicy: 'Rückgaberichtlinie',
      privacyTerms: 'Datenschutz & AGB',
      colStoreInfo: 'Shop-Informationen',
      timezoneLabel: 'Zeitzone',
      brandKit: 'Brand Kit & Agentur-Assets',
      adminPortal: 'Shop-Verwaltung (Admin)',
      copyright: 'Single-Owner Curated Secondhand Store.',
      currencyNote: 'Währung IDR · Zeit Asia/Jakarta (WIB)',
    },
    info: {
      aboutKicker: 'Über Preluxes',
      gradesHeading: 'Zustandsbewertungsskala',
      contactKicker: 'Kundenservice',
      contactHeading: 'Preluxes Kontakt',
      contactIntro: 'Fragen zu Maßen, Zustand oder Zahlungsbestätigung richten Sie bitte direkt an unseren WhatsApp-Service:',
      handlingLabel: 'Bearbeitungszeit',
      faqKicker: 'Hilfe',
      faqHeading: 'Häufig gestellte Fragen',
      policies: {
        shipping: 'Versandrichtlinie',
        returns: 'Rückgabe & Erstattung',
        cancellation: 'Stornierungsrichtlinie',
        privacy: 'Datenschutzrichtlinie',
        terms: 'Allgemeine Geschäftsbedingungen',
      },
    },
    auth: {
      alreadySignedIn: 'Sie sind angemeldet',
      openAdmin: 'Admin-Dashboard öffnen',
      openAccount: 'Kundenkonto öffnen',
      adminTitle: 'Admin-Anmeldung',
      customerTitle: 'Bei Preluxes anmelden',
      adminDesc: 'Eingeschränkter Zugang für Shop-Inhaber und autorisierte Administratoren.',
      customerDesc: 'Lieferadressen speichern, Wunschliste verwalten und Bestellungen verfolgen.',
      continueGoogle: 'Mit Google fortfahren',
      firebaseNote: 'Sichere Authentifizierung über Firebase Authentication.',
    },
  },
  fr: {
    nav: {
      collection: 'Collection',
      newArrivals: 'Nouveautés',
      sale: 'Sélection Prix',
      about: 'Histoire & Curation',
      admin: 'Admin',
      searchAria: 'Rechercher des articles',
      account: 'Compte',
      signIn: 'Connexion',
      cart: 'Panier',
      openCartAria: (c) => `Ouvrir le panier (${c} articles)`,
      changeLangAria: 'Changer de langue',
      accountOrders: 'Mon compte & Commandes',
      signInOrUp: 'Connexion / Inscription',
      adminDashboard: 'Tableau de bord Admin',
    },
    hero: {
      kicker: 'Mode Seconde Main Sélectionnée · Indonésie',
      defaultTitle: 'Trouver ce qui dure. En prendre soin plus longtemps.',
      defaultSubtitle:
        'Preluxes sélectionne des pièces de seconde main — sacs, vêtements, chaussures et accessoires — avec mesures réelles en cm, matières connues et notes d’état transparentes.',
      defaultCta: 'Découvrir la collection',
      curationCta: 'Charte de curation & état',
      demoNote:
        'Note : Le catalogue affiche actuellement des données de démonstration en attendant la publication du stock réel dans Firestore.',
      categoryKicker: 'Catégories choisies',
      defaultFeatured: 'Sélection du moment',
      viewAll: 'Voir toute la collection',
      itemsCount: (c) => `${c} pièces`,
      storyKicker: 'L’esprit Preluxes',
      defaultAboutTitle: 'Une histoire qui continue',
      defaultAboutBody:
        'Certaines pièces achèvent un chapitre mais ont encore toute leur place dans une autre garde-robe. Preluxes favorise cette rencontre avec transparence et soin des matières.',
      quote: '« Coupes intemporelles, mesures précises. Observez chaque détail et l’état réel. »',
      pillars: [
        {
          code: '01. Curation',
          title: 'Forme, usage et longévité',
          body: 'Chaque sac, vêtement, paire de chaussures et accessoire est sélectionné à l’unité pour un usage durable.',
        },
        {
          code: '02. Transparence',
          title: 'Mesures réelles & défauts notés',
          body: 'Nous indiquons les dimensions en centimètres, la composition connue et chaque trace d’usage en toute honnêteté.',
        },
        {
          code: '03. Entretien',
          title: 'Respect de la matière',
          body: 'La seconde main prolonge la vie des belles pièces lorsqu’elles sont choisies et entretenues avec attention.',
        },
        {
          code: '04. Service',
          title: 'Paiement direct via WhatsApp',
          body: 'Prix en IDR, réservation automatique du stock à la commande et confirmation directe avec l’Admin sur WhatsApp.',
        },
      ],
    },
    shop: {
      kicker: 'Catalogue Preluxes',
      titleAll: 'Toute la Collection',
      titleNew: 'Nouveautés',
      titleSale: 'Prix Doux',
      titleCategoryFallback: 'Catégorie',
      showingCount: (c) => `${c} pièces affichées · Prix en IDR`,
      searchPlaceholder: 'Rechercher nom, matière, couleur ou SKU...',
      allConditions: 'Tous les états',
      allStyles: 'Tous les styles',
      sortNewest: 'Plus récents',
      sortPriceAsc: 'Prix : croissant',
      sortPriceDesc: 'Prix : décroissant',
      allFilter: 'Tout',
      onlyAvailable: 'En stock uniquement',
      reset: 'Réinitialiser',
      emptyTitle: 'Aucun article trouvé',
      emptyBody: 'Modifiez vos mots-clés ou réinitialisez les filtres de catégorie et d’état.',
      emptyCta: 'Afficher toute la collection',
    },
    product: {
      backToCollection: 'Retour à la collection',
      notFoundTitle: 'Article introuvable',
      notFoundBody: 'Cet article a peut-être été archivé ou le lien a changé.',
      addToCart: 'Ajouter au panier',
      outOfStock: 'Indisponible',
      sold: 'Vendu',
      reserved: 'Réservé par un autre acheteur',
      availableUnits: (c) => `Disponible (${c} pièce unique)`,
      availabilityLabel: 'Disponibilité',
      demoBadge: 'Démo',
      demoBanner: 'Données de démonstration — Article illustratif présentant la fiche produit Preluxes.',
      viewLabel: 'Vue',
      imageTypes: {
        front: 'Face',
        back: 'Dos',
        detail: 'Détail',
        label: 'Étiquette',
        defect: 'Défaut',
      },
      openDefectTitle: 'Remarques transparentes sur l’état :',
      measurementsTitle: 'Mesures réelles & matière',
      sizeLabel: 'Taille indiquée',
      styleLabel: 'Catégorie / Coupe',
      colorLabel: 'Couleur',
      materialLabel: 'Matière',
      materialFallback: 'Non précisée sur l’étiquette',
      chestWidth: 'Largeur poitrine',
      length: 'Longueur',
      shoulderWidth: 'Largeur épaules',
      sleeveLength: 'Longueur manches',
      waist: 'Tour de taille',
      inseam: 'Entrejambe',
      bagWidth: 'Largeur du sac',
      bagHeight: 'Hauteur du sac',
      shoeSize: 'Pointure',
      curationNotes: 'Note de curation',
      saveWishlist: 'Ajouter aux favoris',
      removeWishlist: 'Retirer des favoris',
      grades: {
        A: { title: 'Grade A — Comme neuf', summary: 'Aucune ou infime trace d’usage ; structure et finitions préservées.' },
        B: { title: 'Grade B — Très bon état', summary: 'Légères marques d’usage normales sans défaut fonctionnel.' },
        C: { title: 'Grade C — Bon état', summary: 'Signes d’usage visibles documentés ouvertement dans la description.' },
        D: { title: 'Grade D — État correct', summary: 'Usure marquée ou défaut précis illustré par des photos.' },
      },
    },
    cart: {
      title: 'Panier',
      itemCount: (c) => `${c} article(s)`,
      emptyTitle: 'Votre panier est encore vide',
      emptyBody: 'Découvrez nos sacs, vêtements, chaussures et accessoires de seconde main.',
      viewCollection: 'Voir la collection',
      subtotal: 'Sous-total',
      serverNote: 'Les frais de port et la disponibilité sont vérifiés sur le serveur avant confirmation WhatsApp.',
      viewCart: 'Voir le panier',
      checkout: 'Commander',
      proceedCheckout: 'Passer à la commande',
      insufficientStock: (a) => `Stock insuffisant (${a} disponible).`,
      sizeShort: 'Taille',
      qtyShort: 'Qté',
    },
    checkout: {
      kicker: 'Commande WhatsApp',
      heading: 'Adresse, Livraison & Confirmation WhatsApp',
      signInPromptTitle: 'Connectez-vous pour commander',
      signInPromptBody: 'Un compte permet de réserver la pièce unique et de suivre votre numéro de suivi en toute sécurité.',
      signInGoogle: 'Se connecter avec Google',
      emptyTitle: 'Votre panier est vide',
      emptyBody: 'Veuillez choisir au moins un article avant de passer commande.',
      demoNotice: 'Note de démonstration : Les articles démo ne sont pas encore dans Firestore. En tant qu’Admin, cliquez sur Seed Data Demonstrasi dans le tableau de bord.',
      addressSection: '1. Adresse de livraison',
      useNewAddress: 'Utiliser une nouvelle adresse',
      recipientName: 'Nom du destinataire *',
      phone: 'Téléphone / WhatsApp *',
      addressLine: 'Adresse complète *',
      city: 'Ville *',
      province: 'Province / Région *',
      district: 'Quartier',
      postalCode: 'Code postal *',
      notes: 'Instructions de livraison (Optionnel)',
      courierSection: '2. Mode de livraison',
      estPrefix: 'Délai est.',
      summaryTitle: 'Récapitulatif',
      couponPlaceholder: 'Code promo (ex. PRELUXES10)',
      apply: 'Appliquer',
      discount: 'Remise',
      shipping: 'Livraison',
      total: 'Total à payer',
      submitOrder: 'Commander & Payer via WhatsApp',
      submittingOrder: 'Réservation du stock en cours...',
      waCheckoutNote: (m) => `Le règlement s’effectue par discussion WhatsApp avec l’Admin Preluxes. La pièce unique est réservée pendant ${m} minutes.`,
      orderLoginTitle: 'Connectez-vous pour voir la commande',
      orderLoginBody: 'Les détails de commande sont protégés et réservés au titulaire du compte.',
      orderNotFound: 'Commande introuvable',
      viewOrderHistory: 'Voir mes commandes',
      orderNumberLabel: 'Numéro de commande',
      createdAt: 'Créée le',
      paymentLabel: 'Paiement',
      fulfilmentLabel: 'Expédition',
      waBoxTitle: 'Confirmer & Payer via WhatsApp Admin',
      waBoxDesc: (d) => `Votre pièce unique est réservée jusqu’à ${d}. Envoyez ce récapitulatif à notre Admin sur WhatsApp pour recevoir les coordonnées de virement / QRIS.`,
      waPayButton: 'Payer via WhatsApp Admin',
      copyMessage: 'Copier le message',
      copiedMessage: 'Copié !',
      cancelOrder: 'Annuler la commande (Libérer le stock)',
      cancelling: 'Annulation...',
      waPaidNotice: 'Paiement vérifié par l’Admin. Votre commande est en cours de préparation.',
      itemsSummary: 'Articles commandés',
      shippingAddressTitle: 'Adresse de livraison',
      courierLabel: 'Transporteur',
      trackingLabel: 'N° de suivi',
      viewAllOrders: 'Voir toutes mes commandes',
      continueShopping: 'Continuer mes achats',
    },
    chatAdmin: {
      fabLabel: 'Chat Admin',
      title: 'Discuter avec l’Admin Preluxes',
      subtitle: 'Questions sur les mesures, l’état ou confirmation de paiement via WhatsApp.',
      hours: 'Horaires : WIB (Asia/Jakarta)',
      quickTopicsLabel: 'Sujets rapides',
      topics: [
        'Demander les mesures & l’état',
        'Confirmer un paiement',
        'Suivre mon colis',
      ],
      messageLabel: 'Message à l’Admin',
      placeholder: 'Écrivez votre message ici...',
      sendWhatsapp: 'Ouvrir WhatsApp',
      copyText: 'Copier',
      copied: 'Copié',
    },
    footer: {
      description: 'Boutique de mode seconde main sélectionnée — sacs, vêtements, chaussures et accessoires avec mesures réelles et état détaillé.',
      colServices: 'Curation & Services',
      allCollections: 'Toute la collection',
      newArrivals: 'Nouveautés',
      salePicks: 'Prix doux',
      faqAndGrades: 'FAQ & Échelle d’état',
      colAbout: 'À propos & Politiques',
      aboutUs: 'À propos de Preluxes',
      contactUs: 'Nous contacter',
      shippingPackaging: 'Livraison & Emballage',
      returnsPolicy: 'Politique de retour',
      privacyTerms: 'Confidentialité & Conditions',
      colStoreInfo: 'Informations boutique',
      timezoneLabel: 'Fuseau horaire',
      brandKit: 'Brand Kit & Ressources Agence',
      adminPortal: 'Portail Gestionnaire (Admin)',
      copyright: 'Single-Owner Curated Secondhand Store.',
      currencyNote: 'Devise IDR · Heure Asia/Jakarta (WIB)',
    },
    info: {
      aboutKicker: 'À propos de Preluxes',
      gradesHeading: 'Échelle d’évaluation de l’état',
      contactKicker: 'Service client',
      contactHeading: 'Contacter Preluxes',
      contactIntro: 'Pour toute question sur les mesures, l’état ou le paiement WhatsApp, contactez-nous directement :',
      handlingLabel: 'Délai de traitement',
      faqKicker: 'Aide',
      faqHeading: 'Foire aux questions',
      policies: {
        shipping: 'Politique de livraison',
        returns: 'Retours & Remboursements',
        cancellation: 'Politique d’annulation',
        privacy: 'Politique de confidentialité',
        terms: 'Conditions générales',
      },
    },
    auth: {
      alreadySignedIn: 'Vous êtes connecté',
      openAdmin: 'Ouvrir le tableau Admin',
      openAccount: 'Ouvrir mon compte',
      adminTitle: 'Connexion Gestionnaire',
      customerTitle: 'Connexion à Preluxes',
      adminDesc: 'Accès réservé au propriétaire et aux administrateurs autorisés.',
      customerDesc: 'Enregistrez vos adresses, gérez vos favoris et suivez vos commandes.',
      continueGoogle: 'Continuer avec Google',
      firebaseNote: 'Authentification sécurisée via Firebase Authentication.',
    },
  },
};
