import { apiFetch, API_BASE_URL } from '../../api';
import SafeImage from '../SafeImage';
import { useEffect, useState } from "react";

type Product = {
  id: number;
  product_name: string;
  price: number;
  image_urls: string;
};

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>読み込み中...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>商品一覧</h1>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {products.map((product) => {
          const images =
            typeof product.image_urls === "string"
              ? JSON.parse(product.image_urls)
              : product.image_urls;

          const imageUrl = images[0];

          return (
            <div
              key={product.id}
              style={{
                width: 200,
                border: "1px solid #ccc",
                padding: 10,
              }}
            >
              <SafeImage
                src={`${API_BASE_URL}${imageUrl}`}
                alt={product.product_name}
                style={{ width: "100%", height: 150, objectFit: "cover" }}
              />

              <h3>{product.product_name}</h3>
              <p>¥{product.price.toLocaleString()}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductList;
