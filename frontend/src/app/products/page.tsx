'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiService } from '@/lib/api-service';
import type { Product } from '@/types/db';

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [buyPrice, setBuyPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [buyDisplay, setBuyDisplay] = useState('');
  const [sellDisplay, setSellDisplay] = useState('');

  const getDynamicGroups = (currentProducts: Product[]) => {
    return Array.from(new Set(currentProducts.map(p => p.group_name))).sort();
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    setLoading(true);
    apiService.getProducts()
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        setLoading(false);
      });
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setGroupName('');
    setBuyPrice(0);
    setSellPrice(0);
    setBuyDisplay('');
    setSellDisplay('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setGroupName(p.group_name);
    setBuyPrice(p.buy_price);
    setSellPrice(p.sell_price);
    setBuyDisplay(String(p.buy_price));
    setSellDisplay(String(p.sell_price));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !groupName.trim()) {
      alert('Product Name and Group are required.');
      return;
    }

    try {
      if (editingProduct) {
        await apiService.updateProduct(editingProduct.id, {
          name: name.trim(),
          group_name: groupName.trim(),
          buy_price: buyPrice,
          sell_price: sellPrice,
        });
      } else {
        const newProduct: Product = {
          id: (() => { try { return crypto.randomUUID() } catch { return Math.random().toString(36).substring(2, 9) } })(),
          name: name.trim(),
          group_name: groupName.trim(),
          buy_price: buyPrice,
          sell_price: sellPrice,
        };
        await apiService.createProduct(newProduct);
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save product.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? All corresponding logs for the product will remain, but it will be removed from future daily states.')) {
      return;
    }
    try {
      await apiService.deleteProduct(id);
      loadProducts();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete product.');
    }
  };

  const dynamicGroups = getDynamicGroups(products);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => router.push(`/?date=${date}`)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/20 bg-white text-xs font-bold text-primary hover:bg-primary hover:text-cream shadow-sm mb-3 transition-all active:scale-[0.98]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-primary">Product Catalog</h1>
        </div>
        <button onClick={openAddModal} className="btn-primary text-sm px-4 py-2 font-bold flex items-center gap-1.5 shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-12 border border-dashed border-primary/20">
          <p className="text-primary/60 mb-4 font-medium">No products in the catalog yet.</p>
          <button onClick={openAddModal} className="btn-primary py-2 px-6 text-sm font-bold inline-block">
            Create First Product
          </button>
        </div>
      ) : (
        <div className="card border border-primary/10 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 text-primary/70 text-xs uppercase font-bold border-b border-primary/10">
                <tr>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-right py-3 px-4">Buy Price</th>
                  <th className="text-right py-3 px-4">Sell Price</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-primary/[0.02] transition-colors">
                    <td className="py-3 px-4 font-semibold text-primary">{p.name}</td>
                    <td className="py-3 px-4 text-primary/70">
                      <span className="bg-primary/5 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {p.group_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">KSh {p.buy_price.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium">KSh {p.sell_price.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openEditModal(p)} className="text-xs font-bold text-accent hover:underline px-2 py-1">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-xs font-bold text-danger hover:underline px-2 py-1">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-cream border border-[#4A2E1B]/20 rounded-2xl max-w-2xl w-full p-10 shadow-2xl animate-scaleUp">
            <h3 className="text-3xl font-bold text-primary mb-8">
              {editingProduct ? 'Edit Catalog Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-primary/70">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tusker Cider Cans"
                  className="w-full px-5 py-4 rounded-xl border-2 border-primary/20 bg-white text-primary text-lg font-medium focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all duration-150"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-primary/70">Category Group</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beer Bottles"
                  className="w-full px-5 py-4 rounded-xl border-2 border-primary/20 bg-white text-primary text-lg font-medium focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all duration-150"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  list="product-groups"
                />
                <datalist id="product-groups">
                  {dynamicGroups.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-primary/70">Buy Price (KSh)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    min="0"
                    required
                    className="w-full px-5 py-4 rounded-xl border-2 border-primary/20 bg-white text-primary text-lg font-medium focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all duration-150"
                    value={buyDisplay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setBuyDisplay(raw);
                      setBuyPrice(parseInt(raw, 10) || 0);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-primary/70">Sell Price (KSh)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    min="0"
                    required
                    className="w-full px-5 py-4 rounded-xl border-2 border-primary/20 bg-white text-primary text-lg font-medium focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all duration-150"
                    value={sellDisplay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setSellDisplay(raw);
                      setSellPrice(parseInt(raw, 10) || 0);
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline flex-1 py-5 text-xl">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 py-5 text-xl">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-primary/40">Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
