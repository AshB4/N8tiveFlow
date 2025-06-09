/** @format */

export default function SeoProductSelector({ selectedProduct, setSelectedProduct, seoVault }) {
    return (
      <label className="block mb-2">
        Select Product:
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="block p-2 border w-full mb-4"
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
  