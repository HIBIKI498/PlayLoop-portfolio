import { apiFetch, API_BASE_URL } from '../../api';
import SafeImage from '../SafeImage';
// src/components/Mypage/Mypage.tsx

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../firebase";
import "../../css/Mypage.css";

// 商品データの型定義
type Product = {
  id: number;
  product_name: string;
  price: number;
  image_urls: string[] | string;
  seller_uid: string;
  buyer_uid?: string | null; 
  status?: string;
  created_at: string;
  favorited_at?: string; // ★いいねした日時を追加
};

// リスト表示用のサブコンポーネント（折りたたみ機能付き）
const ProductSection = ({ 
  title, 
  items, 
  emptyMessage, 
  type, 
  onEdit 
}: { 
  title: string; 
  items: Product[]; 
  emptyMessage: string; 
  type: 'listing' | 'sold' | 'purchase' | 'favorite'; // ★ favorite を追加
  onEdit?: (id: number) => void; 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 表示するアイテムを決定（展開していなければ最新4件のみ）
  const displayItems = isExpanded ? items : items.slice(0, 4);
  const remainingCount = items.length - 4;

  // 画像URL処理ヘルパー
  const getThumbUrl = (item: Product) => {
    let images: string[] = [];
    try {
      if (Array.isArray(item.image_urls)) {
        images = item.image_urls;
      } else if (typeof item.image_urls === "string") {
        if (item.image_urls.trim().startsWith('[')) {
            images = JSON.parse(item.image_urls);
        } else {
            images = [item.image_urls];
        }
      }
    } catch {
       if (typeof item.image_urls === "string") images = [item.image_urls];
    }

    if (images.length > 0) {
        const rawPath = images[0];
        if (rawPath.startsWith('http')) return rawPath;

        if (rawPath.includes('uploads/')) {
            const cleanPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
            return `${API_BASE_URL}/${cleanPath}`;
        }
        return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    }
    return "";
  };

  return (
    <section className="cart-section">
      <h2>{title}</h2>
      <div className="item-list">
        {displayItems.map((item) => {
          // ★ いいねした商品の中にも「売り切れ」があるかもしれないので判定
          const isSoldOut = !!item.buyer_uid || item.status === 'sold';

          return (
          <div key={`${type}-${item.id}`} className="item-row">
            <Link to={`/product/${item.id}`} className="item-content">
              <SafeImage
                src={getThumbUrl(item)}
                alt={item.product_name}
                className="item-image"
                style={isSoldOut ? { filter: 'grayscale(100%)' } : {}} 
              />
              <div className="item-details">
                <h3>{item.product_name}</h3>
                <p>
                  価格：
                  <span className="price-text">
                    ¥{item.price.toLocaleString()}
                  </span>
                </p>

                {/* タイプごとの追加情報 */}
                {type === 'purchase' && (
                  <span style={{ fontSize: '0.8em', color: '#888' }}>
                    購入日: {new Date(item.created_at).toLocaleDateString()}
                  </span>
                )}
                {type === 'favorite' && item.favorited_at && (
                  <span style={{ fontSize: '0.8em', color: '#888', display: 'block' }}>
                    いいねした日: {new Date(item.favorited_at).toLocaleDateString()}
                  </span>
                )}
                
                {/* 売り切れ表示 */}
                {isSoldOut && (
                  <span style={{ fontSize: '0.8em', color: '#e53935', fontWeight: 'bold', display: 'block', marginTop: '4px' }}>
                    SOLD OUT
                  </span>
                )}
              </div>
            </Link>

            {/* 編集ボタン (出品中で、かつ編集関数が渡されている場合のみ表示) */}
            {type === 'listing' && onEdit && (
              <button 
                className="edit-btn"
                onClick={() => onEdit(item.id)}
              >
                編集
              </button>
            )}
          </div>
        )})}

        {/* 0件の場合のメッセージ */}
        {items.length === 0 && (
          <p className="no-items-msg">{emptyMessage}</p>
        )}

        {/* 折りたたみ展開ボタン */}
        {items.length > 4 && (
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'none',
                border: 'none',
                color: '#357fd9',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.95rem'
              }}
            >
              {isExpanded ? '閉じる' : `以下${remainingCount}件を表示する`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

const Mypage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  
  // データ管理
  const [activeProducts, setActiveProducts] = useState<Product[]>([]); // 出品中
  const [soldProducts, setSoldProducts] = useState<Product[]>([]);     // 売却済み
  const [purchaseHistory, setPurchaseHistory] = useState<Product[]>([]);// 購入履歴
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]); // ★いいねした商品
  
  const [dbUserName, setDbUserName] = useState<string>("");


  // 1. ログイン監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. データ取得
  useEffect(() => {
    if (!user) {
        setActiveProducts([]);
        setSoldProducts([]);
        setPurchaseHistory([]);
        setFavoriteProducts([]);
        setDbUserName("");
        return;
    }

    // ユーザー名取得
    apiFetch(`${API_BASE_URL}/api/users/${user.uid}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.f_username) setDbUserName(data.f_username);
      })
      .catch(err => console.error(err));

    // A. 自分の出品商品を全て取得し、販売中と売却済みに分ける
    apiFetch(`${API_BASE_URL}/api/my-products?uid=${user.uid}`)
      .then((res) => res.json())
      .then((data: Product[]) => {
        const active = data.filter(p => !p.buyer_uid && p.status !== 'sold');
        const sold = data.filter(p => p.buyer_uid || p.status === 'sold');
        
        setActiveProducts(active);
        setSoldProducts(sold);
      })
      .catch((err) => console.error("出品取得エラー:", err));

    // B. 購入履歴取得
    apiFetch(`${API_BASE_URL}/api/my-purchase?uid=${user.uid}`)
      .then((res) => res.json())
      .then((data) => setPurchaseHistory(data))
      .catch((err) => console.error("購入履歴エラー:", err));

    // C. ★いいねした商品取得
    apiFetch(`${API_BASE_URL}/api/my-favorites?uid=${user.uid}`)
      .then((res) => res.json())
      .then((data) => setFavoriteProducts(data))
      .catch((err) => console.error("いいね取得エラー:", err));

  }, [user]);

  const handleLogout = async () => {
    try {
      // 1. 先にトップページ（制限のないページ）へ移動させる
      navigate("/"); 
      
      // 2. その後にログアウト処理を実行する
      await signOut(auth); 
    } catch (error) {
      console.error(error);
    }
  };

  const getDisplayName = () => dbUserName || user?.displayName || "ゲストユーザー";
  const getInitials = () => (dbUserName || user?.displayName || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="mypage-container">
      {/* アカウント名 */}
      <section className="account-section">
        <h2 id="account-name">{user ? getDisplayName() : "ロード中..."}</h2>
      </section>

      {/* プロフィール情報 */}
      <section className="profile-info-section">
        <div className="profile-info-container">
          {user?.photoURL ? (
            <SafeImage src={user.photoURL} alt="プロフィール" className="profile-image-display" />
          ) : (
            <div className="profile-icon-initials">{user ? getInitials() : ""}</div>
          )}
          <div className="profile-details-display">
            <p><strong>メールアドレス:</strong> <span>{user?.email}</span></p>
          </div>
        </div>
      </section>

      {/* リンク & ログアウト */}
      <section className="profile-section">
        <div className="profile-links">
          <Link to="/touroku_henkou" className="profile-link">
            <i className="fa-solid fa-gear"></i> 会員情報変更
          </Link>
          <button onClick={handleLogout} className="profile-link logout-btn">
            <i className="fa-solid fa-right-from-bracket"></i> ログアウト
          </button>
        </div>
      </section>

      {/* 0. ★追加: いいねした商品 */}
      <ProductSection 
        title="いいねした商品" 
        items={favoriteProducts} 
        emptyMessage="いいねした商品はまだありません"
        type="favorite"
      />

      {/* 1. 出品中の商品（編集可能） */}
      <ProductSection 
        title="出品中の商品" 
        items={activeProducts} 
        emptyMessage="現在出品中の商品はありません"
        type="listing"
        onEdit={(id) => navigate(`/listing/edit/${id}`)}
      />

      {/* 2. 売却済みの商品 */}
      <ProductSection 
        title="購入された商品（売却済み）" 
        items={soldProducts} 
        emptyMessage="売却済みの商品はまだありません"
        type="sold"
      />

      {/* 3. 購入履歴 */}
      <ProductSection 
        title="購入履歴" 
        items={purchaseHistory} 
        emptyMessage="購入した商品はまだありません"
        type="purchase"
      />
      
    </div>
  );
};

export default Mypage;