import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Upload, X } from 'lucide-react';
import type { Brand, Category, ConditionGrade, GenderStyle, Product, ProductImage, ProductStatus } from '../../types/store.ts';
import { slugify } from '../../utils/commerce.ts';
import { saveProductAdmin, uploadProductImage } from '../../lib/firestoreApi.ts';
import { useStore } from '../../context/StoreContext.tsx';

export function AdminProductEditor({
  initialProduct,
  categories,
  brands,
  onClose,
  onSaved,
}: {
  initialProduct: Product | null;
  categories: Category[];
  brands: Brand[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { notify } = useStore();
  const isNew = !initialProduct || initialProduct.id.startsWith('copy-');
  const [productId] = useState(() =>
    initialProduct && !initialProduct.id.startsWith('copy-')
      ? initialProduct.id
      : `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  );

  const [name, setName] = useState(initialProduct?.name || '');
  const [slug, setSlug] = useState(initialProduct?.slug || '');
  const [sku, setSku] = useState(
    initialProduct?.sku || `PLX-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [categoryId, setCategoryId] = useState(initialProduct?.categoryId || categories[0]?.id || 'cat-pakaian');
  const [brandId, setBrandId] = useState(initialProduct?.brandId || brands[0]?.id || '');
  const [brandName, setBrandName] = useState(initialProduct?.brandName || brands[0]?.name || 'Preluxes Curated');
  const [gender, setGender] = useState<GenderStyle>(initialProduct?.gender || 'Women');
  const [sizeLabel, setSizeLabel] = useState(initialProduct?.sizeLabel || 'M');
  const [color, setColor] = useState(initialProduct?.color || '');
  const [material, setMaterial] = useState(initialProduct?.material || '');
  const [description, setDescription] = useState(initialProduct?.description || '');

  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>(initialProduct?.conditionGrade || 'B');
  const [conditionNotes, setConditionNotes] = useState(initialProduct?.conditionNotes || '');
  const [defectNotes, setDefectNotes] = useState(initialProduct?.defectNotes || '');

  const [chestWidthCm, setChestWidthCm] = useState(initialProduct?.measurements?.chestWidthCm?.toString() || '');
  const [lengthCm, setLengthCm] = useState(initialProduct?.measurements?.lengthCm?.toString() || '');
  const [shoulderWidthCm, setShoulderWidthCm] = useState(initialProduct?.measurements?.shoulderWidthCm?.toString() || '');
  const [sleeveLengthCm, setSleeveLengthCm] = useState(initialProduct?.measurements?.sleeveLengthCm?.toString() || '');
  const [waistCm, setWaistCm] = useState(initialProduct?.measurements?.waistCm?.toString() || '');
  const [shoeSizeEu, setShoeSizeEu] = useState(initialProduct?.measurements?.shoeSizeEu || '');

  const [originalPrice, setOriginalPrice] = useState(initialProduct?.originalPrice?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(initialProduct?.sellingPrice?.toString() || '');
  const [quantity, setQuantity] = useState(initialProduct?.quantity?.toString() || '1');
  const [status, setStatus] = useState<ProductStatus>(initialProduct?.status || 'draft');
  const [isFeatured, setIsFeatured] = useState(initialProduct?.isFeatured || false);
  const [isDemo, setIsDemo] = useState(initialProduct?.isDemo || false);

  const [images, setImages] = useState<ProductImage[]>(
    initialProduct?.images || [
      {
        url: '/src/assets/images/item_linen_blazer_1794946984670.jpg',
        altText: 'Foto produk',
        imageType: 'front',
        isPrimary: true,
        sortOrder: 0,
      },
    ]
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (isNew) {
      setSlug(slugify(val));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notify('Ukuran file maksimal 10 MB.', 'error');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProductImage(file, productId);
      setImages((prev) => [
        ...prev,
        {
          url,
          altText: `${name || 'Produk Preluxes'} — tampak ${prev.length + 1}`,
          imageType: prev.length === 0 ? 'front' : 'detail',
          isPrimary: prev.length === 0,
          sortOrder: prev.length,
        },
      ]);
      notify('Gambar berhasil dikompresi & diunggah ke Firebase Storage.', 'success');
    } catch (err) {
      notify(
        err instanceof Error
          ? `Unggah Storage gagal (${err.message}). Anda tetap dapat menambahkan URL gambar.`
          : 'Unggah Storage gagal.',
        'error'
      );
    } finally {
      setUploading(false);
    }
  };

  const addImageByUrl = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [
      ...prev,
      {
        url: newImageUrl.trim(),
        altText: `${name || 'Produk Preluxes'} — gambar ${prev.length + 1}`,
        imageType: prev.length === 0 ? 'front' : 'detail',
        isPrimary: prev.length === 0,
        sortOrder: prev.length,
      },
    ]);
    setNewImageUrl('');
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((img, i) => ({ ...img, sortOrder: i }));
    });
  };

  const setPrimaryImage = (idx: number) => {
    setImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === idx })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !conditionNotes.trim() || images.length === 0) {
      notify('Lengkapi nama produk, SKU, catatan kondisi tertulis, dan minimal 1 gambar.', 'error');
      return;
    }
    const priceNum = Math.round(Number(sellingPrice));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      notify('Harga jual harus angka IDR valid.', 'error');
      return;
    }

    const catObj = categories.find((c) => c.id === categoryId);
    const primaryImg = images.find((i) => i.isPrimary) || images[0];

    const measurements: Record<string, string | number> = {};
    if (chestWidthCm) measurements.chestWidthCm = Number(chestWidthCm);
    if (lengthCm) measurements.lengthCm = Number(lengthCm);
    if (shoulderWidthCm) measurements.shoulderWidthCm = Number(shoulderWidthCm);
    if (sleeveLengthCm) measurements.sleeveLengthCm = Number(sleeveLengthCm);
    if (waistCm) measurements.waistCm = Number(waistCm);
    if (shoeSizeEu) measurements.shoeSizeEu = shoeSizeEu.trim();

    setSaving(true);
    try {
      await saveProductAdmin({
        id: productId,
        isNew,
        name: name.trim(),
        slug: (slug || slugify(name)).trim(),
        sku: sku.trim().toUpperCase(),
        description: description.trim(),
        categoryId,
        categoryName: catObj?.name || 'Pakaian',
        brandId,
        brandName: brandName.trim() || 'Preluxes Curated',
        gender,
        sizeLabel: sizeLabel.trim(),
        color: color.trim(),
        material: material.trim(),
        conditionGrade,
        conditionNotes: conditionNotes.trim(),
        defectNotes: defectNotes.trim(),
        measurements,
        originalPrice: originalPrice ? Math.round(Number(originalPrice)) : null,
        sellingPrice: priceNum,
        images: images.map((img, i) => ({ ...img, sortOrder: i })),
        primaryImageUrl: primaryImg.url,
        quantity: Math.max(initialProduct?.reservedQuantity || 0, Math.floor(Number(quantity) || 0)),
        reservedQuantity: initialProduct?.reservedQuantity || 0,
        status,
        isFeatured,
        isDemo,
      });
      notify('Produk berhasil disimpan ke Firestore.', 'success');
      await onSaved();
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan produk.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#30302E]/45 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Editor Produk">
      <div className="bg-[#FAF7F2] border border-[#30302E]/20 w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-[#30302E]/12 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl text-[#30302E]">
              {isNew ? 'Tambah Produk Baru' : `Edit Produk: ${initialProduct?.sku}`}
            </h2>
            <p className="text-xs text-[#30302E]/65">
              Wajib mencantumkan catatan kondisi tertulis dan ukuran aktual sebelum dipublikasikan.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup editor produk" className="p-2 hover:bg-[#FAF7F2]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General */}
          <section className="bg-white border border-[#30302E]/12 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <h3 className="sm:col-span-2 font-serif text-lg text-[#30302E]">Informasi Umum</h3>
            <div>
              <label htmlFor="p-name" className="block text-xs font-medium mb-1">Nama Produk *</label>
              <input id="p-name" required value={name} onChange={(e) => handleNameChange(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="p-slug" className="block text-xs font-medium mb-1">Slug URL *</label>
              <input id="p-slug" required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="p-sku" className="block text-xs font-medium mb-1">SKU Unik *</label>
              <input id="p-sku" required value={sku} onChange={(e) => setSku(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="p-cat" className="block text-xs font-medium mb-1">Kategori *</label>
              <select id="p-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-brand" className="block text-xs font-medium mb-1">Merek / Label *</label>
              <input
                id="p-brand"
                required
                value={brandName}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  const found = brands.find((b) => b.name.toLowerCase() === e.target.value.toLowerCase());
                  setBrandId(found?.id || '');
                }}
                className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
              />
            </div>
            <div>
              <label htmlFor="p-gender" className="block text-xs font-medium mb-1">Klasifikasi Gaya</label>
              <select id="p-gender" value={gender} onChange={(e) => setGender(e.target.value as GenderStyle)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20">
                <option value="Women">Women</option>
                <option value="Men">Men</option>
                <option value="Unisex">Unisex</option>
              </select>
            </div>
            <div>
              <label htmlFor="p-color" className="block text-xs font-medium mb-1">Warna</label>
              <input id="p-color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="p-mat" className="block text-xs font-medium mb-1">Material / Bahan</label>
              <input id="p-mat" value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-desc" className="block text-xs font-medium mb-1">Deskripsi & Padanan</label>
              <textarea id="p-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
          </section>

          {/* Condition */}
          <section className="bg-white border border-[#30302E]/12 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <h3 className="sm:col-span-2 font-serif text-lg text-[#30302E]">Kondisi & Keterbukaan Kekurangan</h3>
            <div>
              <label htmlFor="p-grade" className="block text-xs font-medium mb-1">Grade Kondisi *</label>
              <select id="p-grade" value={conditionGrade} onChange={(e) => setConditionGrade(e.target.value as ConditionGrade)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20">
                <option value="A">A — Seperti Baru</option>
                <option value="B">B — Sangat Baik</option>
                <option value="C">C — Baik</option>
                <option value="D">D — Layak Pakai</option>
              </select>
            </div>
            <div>
              <label htmlFor="p-size" className="block text-xs font-medium mb-1">Label Ukuran *</label>
              <input id="p-size" required value={sizeLabel} onChange={(e) => setSizeLabel(e.target.value)} placeholder="mis. M, One Size, EU 41" className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-cond-notes" className="block text-xs font-medium mb-1">Catatan Kondisi Tertulis (Wajib) *</label>
              <textarea id="p-cond-notes" required minLength={5} rows={2} value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-defect" className="block text-xs font-medium mb-1">Catatan Kekurangan / Defect</label>
              <textarea id="p-defect" rows={2} value={defectNotes} onChange={(e) => setDefectNotes(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
          </section>

          {/* Measurements */}
          <section className="bg-white border border-[#30302E]/12 p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <h3 className="col-span-2 sm:col-span-3 font-serif text-lg text-[#30302E]">Ukuran Aktual (cm)</h3>
            <div>
              <label htmlFor="m-chest" className="block text-xs font-medium mb-1">Lebar Dada (cm)</label>
              <input id="m-chest" type="number" step="0.5" value={chestWidthCm} onChange={(e) => setChestWidthCm(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="m-len" className="block text-xs font-medium mb-1">Panjang (cm)</label>
              <input id="m-len" type="number" step="0.5" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="m-sh" className="block text-xs font-medium mb-1">Lebar Bahu (cm)</label>
              <input id="m-sh" type="number" step="0.5" value={shoulderWidthCm} onChange={(e) => setShoulderWidthCm(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="m-sl" className="block text-xs font-medium mb-1">Panjang Lengan (cm)</label>
              <input id="m-sl" type="number" step="0.5" value={sleeveLengthCm} onChange={(e) => setSleeveLengthCm(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="m-waist" className="block text-xs font-medium mb-1">Pinggang (cm)</label>
              <input id="m-waist" type="number" step="0.5" value={waistCm} onChange={(e) => setWaistCm(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="m-shoe" className="block text-xs font-medium mb-1">Ukuran Sepatu</label>
              <input id="m-shoe" value={shoeSizeEu} onChange={(e) => setShoeSizeEu(e.target.value)} placeholder="EU 41" className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
          </section>

          {/* Images */}
          <section className="bg-white border border-[#30302E]/12 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-serif text-lg text-[#30302E]">Galeri Foto Produk</h3>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#30302E] text-[#FAF7F2] text-xs font-medium cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Mengunggah...' : 'Unggah ke Firebase Storage'}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="sr-only" />
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Atau tempel URL gambar..."
                className="flex-1 px-3 py-2 text-xs bg-[#FAF7F2] border border-[#30302E]/20"
              />
              <button type="button" onClick={addImageByUrl} className="px-4 py-2 border border-[#30302E]/25 text-xs font-medium inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah URL</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {images.map((img, idx) => (
                <div key={`${img.url}-${idx}`} className="flex flex-wrap items-center gap-3 p-2.5 border border-[#30302E]/12 bg-[#FAF7F2]">
                  <img src={img.url} alt={img.altText} className="w-14 h-14 object-cover bg-white shrink-0" />
                  <select
                    value={img.imageType}
                    onChange={(e) =>
                      setImages((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, imageType: e.target.value as ProductImage['imageType'] } : item
                        )
                      )
                    }
                    className="px-2 py-1 text-xs bg-white border border-[#30302E]/20"
                  >
                    <option value="front">Tampak Depan</option>
                    <option value="back">Tampak Belakang</option>
                    <option value="label">Label / Tag</option>
                    <option value="detail">Detail Bahan</option>
                    <option value="defect">Foto Kekurangan</option>
                  </select>
                  <input
                    value={img.altText}
                    onChange={(e) =>
                      setImages((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, altText: e.target.value } : item))
                      )
                    }
                    placeholder="Alt text gambar"
                    className="flex-1 min-w-[140px] px-2.5 py-1 text-xs bg-white border border-[#30302E]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setPrimaryImage(idx)}
                    className={`px-2.5 py-1 text-xs font-medium ${
                      img.isPrimary ? 'bg-[#30302E] text-[#FAF7F2]' : 'border border-[#30302E]/20 bg-white'
                    }`}
                  >
                    {img.isPrimary ? 'Utama' : 'Jadikan Utama'}
                  </button>
                  <button type="button" onClick={() => moveImage(idx, -1)} aria-label="Geser naik" className="p-1.5 border border-[#30302E]/15 bg-white">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => moveImage(idx, 1)} aria-label="Geser turun" className="p-1.5 border border-[#30302E]/15 bg-white">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Hapus gambar"
                      className="p-1.5 text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Pricing, Inventory, Publishing */}
          <section className="bg-white border border-[#30302E]/12 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <h3 className="sm:col-span-3 font-serif text-lg text-[#30302E]">Harga, Stok & Publikasi</h3>
            <div>
              <label htmlFor="p-price" className="block text-xs font-medium mb-1">Harga Jual (IDR) *</label>
              <input id="p-price" type="number" required min={0} value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="p-orig" className="block text-xs font-medium mb-1">Harga Referensi / Coret (IDR)</label>
              <input id="p-orig" type="number" min={0} value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="p-qty" className="block text-xs font-medium mb-1">Total Stok *</label>
              <input id="p-qty" type="number" required min={initialProduct?.reservedQuantity || 0} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
            </div>
            <div>
              <label htmlFor="p-status" className="block text-xs font-medium mb-1">Status Publikasi</label>
              <select id="p-status" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20">
                <option value="draft">Draft</option>
                <option value="published">Published (Tampil di Toko)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium pt-5 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-[#30302E]" />
              <span>Tampilkan di Pilihan Terkurasi Beranda</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium pt-5 cursor-pointer">
              <input type="checkbox" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} className="accent-[#30302E]" />
              <span>Tandai sebagai Data Demonstrasi</span>
            </label>
          </section>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-[#30302E]/25 text-xs font-medium bg-white">
              Batal
            </button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#30302E] text-[#FAF7F2] text-xs font-medium">
              {saving ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
