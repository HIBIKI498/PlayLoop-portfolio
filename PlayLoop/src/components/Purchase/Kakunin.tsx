import { apiFetch, API_BASE_URL } from '../../api';
import SafeImage from '../SafeImage';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { auth } from "../../firebase";
import styles from '../../css/Kakunin.module.css';

interface ProductDetail {
  id: number;
  seller_uid: string;
  product_name: string;
  price: number;
  image_urls: string | string[];
  shipping: string;
  days: string;
  condition: string;
  platform: string;
  status?: string; 
}

interface PaymentData {
  method: string;
}

interface AddressData {
  postalCode: string;
  prefecture: string;
  city: string;
  address: string;
  recipient: string;
}

interface Errors {
  payment?: string; 
  address?: string; 
  general?: string; 
}

const Kakunin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [sellerName, setSellerName] = useState<string>("取得中...");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [errors, setErrors] = useState<Errors>({});


  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data: ProductDetail) => {
        setProduct(data);
        setLoading(false);

        if (data.seller_uid) {
            apiFetch(`${API_BASE_URL}/api/users/${data.seller_uid}`)
                .then(res => res.json())
                .then(userData => {
                    if (userData && userData.f_username) {
                        setSellerName(userData.f_username);
                    } else {
                        setSellerName("名無しユーザー");
                    }
                })
                .catch(err => {
                    console.error("出品者情報取得エラー:", err);
                    setSellerName("不明なユーザー");
                });
        }
      })
      .catch((err) => {
        console.error("データ取得エラー:", err);
        setLoading(false);
      });

    const savedPayment = sessionStorage.getItem('paymentData');
    const savedAddress = sessionStorage.getItem('addressData');

    if (savedPayment) {
      try {
        const { method } = JSON.parse(savedPayment);
        if (typeof method === 'string') {
          const sanitized = { method };
          setPaymentData(sanitized);
          sessionStorage.setItem('paymentData', JSON.stringify(sanitized));
        } else sessionStorage.removeItem('paymentData');
      } catch { sessionStorage.removeItem('paymentData'); }
    }
    if (savedAddress) setAddressData(JSON.parse(savedAddress));
  }, [id]);

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.includes('uploads/')) {
      const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      return `${API_BASE_URL}/${cleanPath}`;
    }
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  };

  const getDisplayImage = (): string | undefined => {
    if (!product || !product.image_urls) return undefined;
    let images: string[] = [];
    try {
      if (Array.isArray(product.image_urls)) {
        images = product.image_urls;
      } else if (typeof product.image_urls === 'string') {
        if (product.image_urls.trim().startsWith('[')) {
           const parsed = JSON.parse(product.image_urls);
           images = Array.isArray(parsed) ? parsed : [product.image_urls];
        } else {
           images = [product.image_urls];
        }
      }
    } catch {
      if (typeof product.image_urls === 'string') {
          images = [product.image_urls];
      }
    }
    return images.length > 0 ? getImageUrl(images[0]) : undefined;
  };

  const handlePurchase = async () => {
    const currentUser = auth.currentUser;
    const uid = currentUser ? currentUser.uid : null;

    const newErrors: Errors = {};
    let hasError = false;

    if (!paymentData) {
      newErrors.payment = "支払い方法を選択してください";
      hasError = true;
    }
    if (!addressData) {
      newErrors.address = "配送先住所を登録してください";
      hasError = true;
    }

    setErrors(newErrors); 

    if (hasError) return; 

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/purchase/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: uid }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setErrors({ general: `購入できませんでした: ${errorText}` });
        return;
      }

      sessionStorage.removeItem('paymentData');
      sessionStorage.removeItem('addressData');

      navigate('/Purchasecomplete'); 

    } catch (err) {
      console.error("購入エラー:", err);
      setErrors({ general: "通信エラーが発生しました。しばらくしてから再度お試しください。" });
    }
  };

  const getSellerInitials = () => {
    if (sellerName === "取得中...") return "";
    return (sellerName || "U").slice(0, 2).toUpperCase();
  };

  if (loading) return <div className={styles.container}>読み込み中...</div>;
  if (!product) return <div className={styles.container}>商品情報が見つかりません</div>;

  // もし売り切れ商品だった場合は購入画面へのアクセスをブロック
  const isSold = product.status === "売り切れ" || product.status === "sold" || product.status === "購入済";
  if (isSold) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container} style={{ textAlign: 'center', padding: '50px 20px' }}>
          <h2 style={{ color: '#ea352d', marginBottom: '20px' }}>申し訳ございません。</h2>
          <p style={{ fontSize: '1.2rem', color: '#333', marginBottom: '30px' }}>この商品はすでに売り切れています。</p>
          <button onClick={() => navigate(-1)} className={styles.btnMain} style={{ width: 'auto', padding: '10px 40px' }}>
            前のページに戻る
          </button>
        </div>
      </div>
    );
  }

  const displayImage = getDisplayImage();

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <h1>購入の確認</h1>

        <div className={styles.product}>
          {displayImage && (
            <div style={{ 
              width: '120px', height: '120px', flexShrink: 0, backgroundColor: '#f5f5f5', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              borderRadius: '8px', overflow: 'hidden', marginRight: '20px'
            }}>
              <SafeImage src={displayImage} alt={product.product_name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          )}
          <div className={styles.productInfo}>
            <p className={styles.productName}>{product.product_name}</p>
            <p className={styles.productPrice}>¥{product.price.toLocaleString()}(税込)</p>
            
            <div className={styles.productMeta} style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
              <span className={styles.productState}>プラットフォーム：{product.platform}</span>
              <span className={styles.productState}>商品の状態：{product.condition}</span>
              <span className={styles.shipDays}>発送までの日数：{product.days}</span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '10px', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #eee', width: 'fit-content' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#b0bec5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {getSellerInitials()}
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#333' }}>
                  {sellerName}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2>支払い方法</h2>
          {paymentData ? (
            <div id="method-display">
               <p style={{fontWeight:'bold'}}>{paymentData.method}</p>
            </div>
          ) : (
             <p style={{color: '#e63946'}}>未選択</p>
          )}
          <Link to="/shiharai" className={styles.link}>支払い方法を追加・変更する</Link>
          {errors.payment && <p className={styles.errorMsg}>{errors.payment}</p>}
        </div>

        <div className={styles.section}>
          <h2>配送先</h2>
          {addressData ? (
             <div id="address-display">
                <p>〒{addressData.postalCode}</p>
                <p>{addressData.prefecture} {addressData.city} {addressData.address}</p>
                <p>受取人: {addressData.recipient}</p>
             </div>
          ) : (
             <p style={{color: '#e63946'}}>未登録</p>
          )}
          <Link to="/juusyo" className={styles.link}>配送先住所を追加・変更する</Link>
          {errors.address && <p className={styles.errorMsg}>{errors.address}</p>}
        </div>

        <div className={styles.summary}>
          <p>商品代金 <span>¥{product.price.toLocaleString()}</span></p>
          <p className={styles.total}>支払い金額 <span>¥{product.price.toLocaleString()}</span></p>
        </div>

        {errors.general && (
          <div className={styles.generalError}>
            <i className="fa-solid fa-triangle-exclamation"></i> {errors.general}
          </div>
        )}

        <button onClick={handlePurchase} className={styles.btnMain}>
          購入を確定する
        </button>
        
        <p className={styles.terms}>
          利用規約およびプライバシーポリシーに同意の上、ご購入ください。
        </p>
      </div>
    </div>
  );
};

export default Kakunin;