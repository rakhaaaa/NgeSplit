import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import {
  Plus,
  ReceiptText,
  SplitSquareVertical,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'

const formatRupiah = (nominal) =>
  `Rp ${Number(nominal || 0).toLocaleString('id-ID')}`

const tanggalHariIni = () => new Date().toISOString().split('T')[0]

export default function App() {
  const [data, setData] = useState([])
  const [splits, setSplits] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('transaksi')
  const [filter, setFilter] = useState('semua')

  const [form, setForm] = useState({
    tipe: 'keluar',
    jumlah: '',
    ket: '',
    kat: 'Makanan',
    tgl: tanggalHariIni(),
  })

  const [splitForm, setSplitForm] = useState({
    judul: '',
    tgl: tanggalHariIni(),
    pajak: '',
    ongkir: '',
  })

  const [menuList, setMenuList] = useState([
    { nama_menu: '', harga_satuan: '', qty: 1, pemesan: ['Saya'] },
  ])

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Gagal cek session:', sessionError.message)
      }

      if (session?.user) {
        setUser(session.user)
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInAnonymously()

      if (error) {
        console.error('Gagal login tamu:', error.message)
        alert(
          'Login tamu gagal. Pastikan "Allow anonymous sign-ins" di Supabase sudah aktif.',
        )
        setLoading(false)
        return
      }

      setUser(data.user ?? null)
      setLoading(false)
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      ambilData()
      ambilSplitBill()
    }
  }, [user])

  const ambilData = async () => {
    const { data, error } = await supabase
      .from('transaksi')
      .select('*')
      .eq('user_id', user.id)
      .order('tgl', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Gagal ambil transaksi:', error.message)
      return
    }

    setData(data || [])
  }

  const tambah = async () => {
    if (!form.jumlah || !form.ket) {
      alert('Lengkapi jumlah dan keterangan dulu ya.')
      return
    }

    const jumlahAngka = parseInt(form.jumlah)
    if (Number.isNaN(jumlahAngka) || jumlahAngka <= 0) {
      alert('Jumlah harus lebih dari 0.')
      return
    }

    const { error } = await supabase.from('transaksi').insert({
      user_id: user.id,
      ...form,
      jumlah: jumlahAngka,
    })

    if (error) {
      console.error('Gagal tambah transaksi:', error.message)
      alert('Transaksi gagal ditambahkan.')
      return
    }

    setForm({
      ...form,
      jumlah: '',
      ket: '',
    })
    ambilData()
  }

  const hapus = async (id) => {
    if (!confirm('Yakin mau hapus transaksi ini?')) return

    const { error } = await supabase
      .from('transaksi')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Gagal hapus transaksi:', error.message)
      alert('Transaksi gagal dihapus.')
      return
    }

    ambilData()
  }

  const getBulanTahun = (tgl) =>
    new Date(tgl).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    })

  const bulanUnik = [...new Set(data.map((item) => getBulanTahun(item.tgl)))]
  const dataFilter =
    filter === 'semua'
      ? data
      : data.filter((item) => getBulanTahun(item.tgl) === filter)

  const masuk = dataFilter
    .filter((item) => item.tipe === 'masuk')
    .reduce((acc, item) => acc + item.jumlah, 0)

  const keluar = dataFilter
    .filter((item) => item.tipe === 'keluar')
    .reduce((acc, item) => acc + item.jumlah, 0)

  const saldo = masuk - keluar

  const ambilSplitBill = async () => {
    const { data, error } = await supabase
      .from('split_bills')
      .select(
        `
        *,
        split_bill_menus(
          *,
          split_bill_pesanan(*)
        )
      `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Gagal ambil split bill:', error.message)
      return
    }

    setSplits(data || [])
  }

  const tambahMenu = () => {
    setMenuList([
      ...menuList,
      { nama_menu: '', harga_satuan: '', qty: 1, pemesan: ['Saya'] },
    ])
  }

  const hapusMenu = (index) => {
    if (menuList.length === 1) {
      alert('Minimal harus ada 1 menu.')
      return
    }

    setMenuList(menuList.filter((_, i) => i !== index))
  }

  const updateMenu = (index, field, value) => {
    const baru = [...menuList]
    baru[index][field] = value
    setMenuList(baru)
  }

  const togglePemesan = (menuIndex, nama) => {
    const baru = [...menuList]
    const list = baru[menuIndex].pemesan

    if (list.includes(nama)) {
      if (list.length === 1) {
        alert('Minimal 1 orang di tiap menu ya.')
        return
      }
      baru[menuIndex].pemesan = list.filter((item) => item !== nama)
    } else {
      baru[menuIndex].pemesan = [...list, nama]
    }

    setMenuList(baru)
  }

  const tambahOrangKeMenu = (menuIndex) => {
    const nama = prompt('Masukkan nama orang:')
    if (!nama || !nama.trim()) return

    const namaBersih = nama.trim()
    const baru = [...menuList]

    if (!baru[menuIndex].pemesan.includes(namaBersih)) {
      baru[menuIndex].pemesan.push(namaBersih)
      setMenuList(baru)
    }
  }

  const hitungTotal = () => {
    const totalMenu = menuList.reduce((acc, item) => {
      return acc + parseInt(item.harga_satuan || 0) * parseInt(item.qty || 1)
    }, 0)

    return totalMenu + parseInt(splitForm.pajak || 0) + parseInt(splitForm.ongkir || 0)
  }

  const getSemuaOrangDraft = () => [...new Set(menuList.flatMap((item) => item.pemesan))]

  const hitungTagihanOrang = (nama) => {
    let total = 0

    menuList.forEach((menu) => {
      if (menu.pemesan.includes(nama)) {
        const hargaMenu = parseInt(menu.harga_satuan || 0) * parseInt(menu.qty || 1)
        total += hargaMenu / menu.pemesan.length
      }
    })

    const semuaOrang = getSemuaOrangDraft()
    const biayaTambahan =
      (parseInt(splitForm.pajak || 0) + parseInt(splitForm.ongkir || 0)) /
      (semuaOrang.length || 1)

    if (semuaOrang.includes(nama)) total += biayaTambahan

    return Math.round(total)
  }

  const simpanSplitBill = async () => {
    if (!splitForm.judul) {
      alert('Isi judul split bill dulu ya.')
      return
    }

    if (menuList.some((menu) => !menu.nama_menu || !menu.harga_satuan)) {
      alert('Lengkapi semua nama menu dan harga dulu.')
      return
    }

    const { data: bill, error: billError } = await supabase
      .from('split_bills')
      .insert({
        user_id: user.id,
        judul: splitForm.judul,
        tgl: splitForm.tgl,
        pajak: parseInt(splitForm.pajak || 0),
        ongkir: parseInt(splitForm.ongkir || 0),
      })
      .select()
      .single()

    if (billError) {
      console.error('Gagal simpan split bill:', billError.message)
      alert('Split bill gagal disimpan.')
      return
    }

    for (const menu of menuList) {
      const { data: menuData, error: menuError } = await supabase
        .from('split_bill_menus')
        .insert({
          split_bill_id: bill.id,
          nama_menu: menu.nama_menu,
          harga_satuan: parseInt(menu.harga_satuan),
          qty: parseInt(menu.qty || 1),
        })
        .select()
        .single()

      if (menuError) {
        console.error('Gagal simpan menu:', menuError.message)
        alert('Ada menu yang gagal disimpan.')
        return
      }

      const pesanan = menu.pemesan.map((nama) => ({
        menu_id: menuData.id,
        nama_orang: nama,
      }))

      const { error: pesananError } = await supabase
        .from('split_bill_pesanan')
        .insert(pesanan)

      if (pesananError) {
        console.error('Gagal simpan pemesan:', pesananError.message)
        alert('Data pemesan gagal disimpan.')
        return
      }
    }

    const tagihanSaya = hitungTagihanOrang('Saya')

    if (tagihanSaya > 0) {
      await supabase.from('transaksi').insert({
        user_id: user.id,
        tipe: 'keluar',
        jumlah: tagihanSaya,
        ket: `Split: ${splitForm.judul}`,
        kat: 'Makanan',
        tgl: splitForm.tgl,
      })
    }

    setSplitForm({
      judul: '',
      tgl: tanggalHariIni(),
      pajak: '',
      ongkir: '',
    })

    setMenuList([{ nama_menu: '', harga_satuan: '', qty: 1, pemesan: ['Saya'] }])

    ambilSplitBill()
    ambilData()

    alert(
      `Split bill berhasil disimpan. Bagian kamu ${formatRupiah(
        tagihanSaya,
      )} otomatis masuk ke pengeluaran.`,
    )
  }

  const hitungTagihanDariBill = (bill, nama) => {
    let total = 0

    bill.split_bill_menus.forEach((menu) => {
      const pemesan = menu.split_bill_pesanan.map((p) => p.nama_orang)
      if (pemesan.includes(nama)) {
        const hargaMenu = menu.harga_satuan * menu.qty
        total += hargaMenu / pemesan.length
      }
    })

    const semuaOrang = [
      ...new Set(
        bill.split_bill_menus.flatMap((menu) =>
          menu.split_bill_pesanan.map((pesanan) => pesanan.nama_orang),
        ),
      ),
    ]

    const biayaTambahan = (bill.pajak + bill.ongkir) / (semuaOrang.length || 1)
    if (semuaOrang.includes(nama)) total += biayaTambahan

    return Math.round(total)
  }

  const buatPesanTagihan = (bill, nama, total) => {
    const rincianMenu = bill.split_bill_menus
      .filter((menu) => menu.split_bill_pesanan.some((p) => p.nama_orang === nama))
      .map((menu) => {
        const jumlahOrang = menu.split_bill_pesanan.length
        const hargaPerOrang = (menu.harga_satuan * menu.qty) / jumlahOrang
        return `• ${menu.nama_menu} x${menu.qty}: ${formatRupiah(Math.round(hargaPerOrang))}`
      })
      .join('%0A')

    const semuaOrang = [
      ...new Set(
        bill.split_bill_menus.flatMap((menu) =>
          menu.split_bill_pesanan.map((pesanan) => pesanan.nama_orang),
        ),
      ),
    ]

    const biayaTambahan = Math.round((bill.pajak + bill.ongkir) / (semuaOrang.length || 1))

    const teks =
      `Hai ${nama} 👋%0A%0A` +
      `Nagih patungan *${bill.judul}* tanggal ${new Date(bill.tgl).toLocaleDateString('id-ID')} yaa.%0A%0A` +
      `*Rincian kamu:*%0A${rincianMenu}%0A• Pajak + Ongkir: ${formatRupiah(biayaTambahan)}%0A%0A` +
      `*Total: ${formatRupiah(total)}*%0A%0A` +
      `Transfer ke:%0ABCA 1234567890 a/n Nama Kamu%0Aatau Dana: 081234567890%0A%0AMakasih yaa 🙏%0A%0A_Dikirim dari KeuanganKu_`

    return `https://wa.me/?text=${teks}`
  }

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Menyiapkan mode tamu...</div>
  }

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm border border-gray-100 text-center">
          <Wallet className="mx-auto mb-4 text-blue-600" size={48} />
          <h1 className="text-2xl font-bold text-gray-900">KeuanganKu</h1>
          <p className="mt-2 text-sm text-gray-500">
            Gagal membuat sesi tamu. Cek pengaturan anonymous sign-in di Supabase.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Wallet className="text-blue-600" />
              KeuanganKu
            </h1>
            <p className="text-sm text-gray-500">Mode tamu aktif</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-1 shadow-sm border border-gray-100 flex gap-1">
          <button
            onClick={() => setTab('transaksi')}
            className={`flex-1 rounded-xl py-2 font-medium transition ${
              tab === 'transaksi' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <ReceiptText size={16} /> Transaksi
            </span>
          </button>

          <button
            onClick={() => setTab('splitbill')}
            className={`flex-1 rounded-xl py-2 font-medium transition ${
              tab === 'splitbill' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <SplitSquareVertical size={16} /> Split Bill
            </span>
          </button>
        </div>

        {tab === 'transaksi' ? (
          <>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Saldo Saat Ini</p>
              <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatRupiah(saldo)}
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <TrendingUp size={18} /> {formatRupiah(masuk)}
                </div>
                <div className="flex items-center gap-1 text-red-600 font-medium">
                  <TrendingDown size={18} /> {formatRupiah(keluar)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={form.tipe}
                  onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  <option value="masuk">Pemasukan</option>
                  <option value="keluar">Pengeluaran</option>
                </select>

                <input
                  type="number"
                  placeholder="Jumlah"
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                />
              </div>

              <input
                type="text"
                placeholder="Keterangan: Gaji, Jajan, dll"
                value={form.ket}
                onChange={(e) => setForm({ ...form, ket: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={form.kat}
                  onChange={(e) => setForm({ ...form, kat: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  {['Gaji', 'Freelance', 'Makanan', 'Transport', 'Tagihan', 'Belanja', 'Lainnya'].map(
                    (item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ),
                  )}
                </select>

                <input
                  type="date"
                  value={form.tgl}
                  onChange={(e) => setForm({ ...form, tgl: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                />
              </div>

              <button
                onClick={tambah}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={18} /> Tambah Transaksi
              </button>
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-3"
            >
              <option value="semua">Semua Bulan</option>
              {bulanUnik.map((bulan) => (
                <option key={bulan} value={bulan}>
                  {bulan}
                </option>
              ))}
            </select>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 divide-y divide-gray-100">
              {dataFilter.length === 0 ? (
                <p className="p-6 text-center text-gray-500">Belum ada transaksi.</p>
              ) : (
                dataFilter.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.ket}</p>
                      <p className="text-sm text-gray-500">
                        {item.kat} • {new Date(item.tgl).toLocaleDateString('id-ID')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p
                        className={`whitespace-nowrap font-semibold ${
                          item.tipe === 'masuk' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {item.tipe === 'masuk' ? '+' : '-'} {formatRupiah(item.jumlah)}
                      </p>
                      <button onClick={() => hapus(item.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
              <input
                type="text"
                placeholder="Judul: Bukber Warung Padang"
                value={splitForm.judul}
                onChange={(e) => setSplitForm({ ...splitForm, judul: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3"
              />

              <input
                type="date"
                value={splitForm.tgl}
                onChange={(e) => setSplitForm({ ...splitForm, tgl: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3"
              />

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Rincian Pesanan:</p>

                {menuList.map((menu, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <input
                        type="text"
                        placeholder="Nama menu: Ayam Bakar"
                        value={menu.nama_menu}
                        onChange={(e) => updateMenu(index, 'nama_menu', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                      />
                      <button
                        onClick={() => hapusMenu(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                        title="Hapus menu"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Harga"
                        value={menu.harga_satuan}
                        onChange={(e) => updateMenu(index, 'harga_satuan', e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white p-2 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={menu.qty}
                        onChange={(e) => updateMenu(index, 'qty', e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white p-2 text-sm"
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-xs text-gray-500">Dipesan oleh:</p>
                      <div className="flex flex-wrap gap-1">
                        {menu.pemesan.map((nama) => (
                          <span
                            key={nama}
                            onClick={() => togglePemesan(index, nama)}
                            className="cursor-pointer rounded px-2 py-1 text-xs bg-blue-100 text-blue-700"
                          >
                            {nama} ✕
                          </span>
                        ))}
                        <button
                          onClick={() => tambahOrangKeMenu(index)}
                          className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                        >
                          + Orang
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button onClick={tambahMenu} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  + Tambah Menu
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Pajak Rp"
                  value={splitForm.pajak}
                  onChange={(e) => setSplitForm({ ...splitForm, pajak: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                />
                <input
                  type="number"
                  placeholder="Ongkir Rp"
                  value={splitForm.ongkir}
                  onChange={(e) => setSplitForm({ ...splitForm, ongkir: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <div className="flex justify-between text-sm">
                  <span>Total Bill:</span>
                  <span className="font-bold">{formatRupiah(hitungTotal())}</span>
                </div>
                <div className="flex justify-between text-sm text-blue-700">
                  <span>Bagian Saya:</span>
                  <span className="font-bold">{formatRupiah(hitungTagihanOrang('Saya'))}</span>
                </div>
              </div>

              <button
                onClick={simpanSplitBill}
                className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700"
              >
                Simpan Split Bill
              </button>
            </div>

            <div className="space-y-3">
              {splits.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-gray-500 shadow-sm">
                  Belum ada data split bill.
                </div>
              ) : (
                splits.map((bill) => {
                  const totalBill =
                    bill.split_bill_menus.reduce(
                      (acc, menu) => acc + menu.harga_satuan * menu.qty,
                      0,
                    ) +
                    bill.pajak +
                    bill.ongkir

                  const semuaOrang = [
                    ...new Set(
                      bill.split_bill_menus.flatMap((menu) =>
                        menu.split_bill_pesanan.map((pesanan) => pesanan.nama_orang),
                      ),
                    ),
                  ]

                  return (
                    <div key={bill.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="mb-3">
                        <p className="font-semibold text-gray-900">{bill.judul}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(bill.tgl).toLocaleDateString('id-ID')} • Total{' '}
                          {formatRupiah(totalBill)}
                        </p>
                      </div>

                      <div className="mb-3 space-y-2 border-b border-gray-100 pb-3">
                        {bill.split_bill_menus.map((menu) => (
                          <div key={menu.id} className="text-sm">
                            <div className="flex justify-between gap-3">
                              <span>
                                {menu.nama_menu} x{menu.qty}
                              </span>
                              <span>{formatRupiah(menu.harga_satuan * menu.qty)}</span>
                            </div>
                            <p className="pl-2 text-xs text-gray-500">
                              → {menu.split_bill_pesanan.map((p) => p.nama_orang).join(', ')}
                            </p>
                          </div>
                        ))}

                        {bill.pajak > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Pajak</span>
                            <span>{formatRupiah(bill.pajak)}</span>
                          </div>
                        )}

                        {bill.ongkir > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Ongkir</span>
                            <span>{formatRupiah(bill.ongkir)}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Tagih per orang:</p>
                        {semuaOrang.map((nama) => {
                          const totalOrang = hitungTagihanDariBill(bill, nama)
                          const waLink = buatPesanTagihan(bill, nama, totalOrang)

                          return (
                            <div
                              key={nama}
                              className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{nama}</p>
                                <p className="text-sm text-gray-500">{formatRupiah(totalOrang)}</p>
                              </div>

                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                              >
                                Tagih via WhatsApp
                              </a>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}