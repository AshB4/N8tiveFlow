/** @format */

export default function SeoProductSelector({ selectedProduct, setSelectedProduct, seoVault }) {
    return (
      <label className="block mb-2">
        Select Product:
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="block p-2 bg-black text-green-400 border border-gray-600 w-full mb-4 focus:border-green-400 focus:shadow-lg focus:shadow-green-500/50"
        >
          <option value="">-- Choose One --</option>
          {Object.keys(seoVault).map((product) => (
            <option key={product} value={product}>
              {product}
            </option>
          ))}
        </select>
      </label>
    );
  }
  