import { apiFetch, API_BASE_URL } from '../../api';
import SafeImage from '../SafeImage';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from '../../firebase';
import styles from '../../css/ProductPage.module.css';

// 必要な型定義を追加
interface CommentData {
  id: number;
  user_uid: string;
  f_username: string;
  comment: string;
  created_at: string;
}

interface ProductDetail {
  id: number;
  seller_uid: string;
  product_name: string;
  category: string;
  condition: string;
  platform: string; 
  shipping: string;
  days: string;
  price: number;
  description: string;
  image_urls: string | string[]; 
  status?: string; // ★追加: 売り切れ判定用（DBに合わせる必要があります）
}

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [user, setUser] = useState<User | null>(null);
  const [sellerName, setSellerName] = useState<string>("取得中...");

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [commentsList, setCommentsList] = useState<CommentData[]>([]);
  const [comment, setComment] = useState("");


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const fetchComments = useCallback(() => {
      apiFetch(`${API_BASE_URL}/api/products/${id}/comments`)
        .then(res => res.json())
        .then(data => setCommentsList(data))
        .catch(err => console.error("コメント取得エラー:", err));
    }, [id]);

  useEffect(() => {
      apiFetch(`${API_BASE_URL}/api/products/${id}`)
        .then(res => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then((data: ProductDetail) => {
          setProduct(data);
          setLoading(false);
          fetchComments(); // コメントも取得
  
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
        .catch(err => {
          console.error("データ取得エラー:", err);
          setLoading(false);
        });
    }, [id, fetchComments]);

  useEffect(() => {
    let url = `${API_BASE_URL}/api/favorites/${id}`;
    if (user) {
        url += `?uid=${user.uid}`;
    }
    apiFetch(url)
      .then(res => res.json())
      .then(data => {
          setIsLiked(data.isLiked);
          setLikeCount(data.count);
      })
      .catch(err => console.error("いいね取得エラー:", err));
  }, [id, user]);

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.includes('uploads/')) {
      const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      return `${API_BASE_URL}/${cleanPath}`;
    }
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  };

  const getDisplayImages = (): string[] => {
    if (!product || !product.image_urls) return [];
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
    return images.map(getImageUrl);
  };

  const displayImages = getDisplayImages();

  const handleNextImage = () => {
    if (displayImages.length === 0) return;
    setCurrentImageIndex((prev) => prev === displayImages.length - 1 ? 0 : prev + 1);
  };

  const handlePrevImage = () => {
    if (displayImages.length === 0) return;
    setCurrentImageIndex((prev) => prev === 0 ? displayImages.length - 1 : prev - 1);
  };

  const handleLikeToggle = async () => {
    if (user && product && user.uid === product.seller_uid) return;
    if (!user) {
        alert("いいねするにはログインしてください");
        return;
    }

    try {
        if (isLiked) {
            const res = await apiFetch(`${API_BASE_URL}/api/favorites`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid, productId: id })
            });
            if (res.ok) {
                setIsLiked(false);
                setLikeCount(prev => prev - 1);
            }
        } else {
            const res = await apiFetch(`${API_BASE_URL}/api/favorites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid, productId: id })
            });
            if (res.ok) {
                setIsLiked(true);
                setLikeCount(prev => prev + 1);
            }
        }
    } catch (err) {
        console.error("いいねの更新に失敗しました", err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        alert("コメントするにはログインしてください");
        return;
    }
    if (!comment.trim()) return;

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/products/${id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_uid: user.uid, comment: comment })
        });
        if (response.ok) {
            setComment(""); 
            fetchComments(); 
        }
    } catch (err) {
        console.error("コメント投稿エラー:", err);
    }
  };

  const getSellerInitials = () => {
    if (sellerName === "取得中...") return "";
    return (sellerName || "U").slice(0, 2).toUpperCase();
  };

  const getInitials = (name: string) => {
    return (name || "U").slice(0, 2).toUpperCase();
  };

  if (loading) return <div className={styles.container}>読み込み中...</div>;
  if (!product) return <div className={styles.container}>商品が見つかりません</div>;

  const isSeller = user && user.uid === product.seller_uid;
  
  // 売り切れ判定（DBのデータに合わせて条件を変更してください）
  const isSold = product.status === "売り切れ" || product.status === "sold" || product.status === "購入済";

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.pageTitleArea}>
          <h1>商品詳細</h1>
        </div>

        <div className={styles.mainContent}>
          <div className={styles.leftColumn}>
            <div className={styles.sliderContainer}>
              {displayImages.length > 1 && (
                <button className={styles.imgPrev} onClick={handlePrevImage}>&lt;</button>
              )}
              
              <div 
                className={styles.imageWrapper} 
                style={{ 
                  width: '100%', height: '400px', backgroundColor: '#f5f5f5', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', borderRadius: '8px', position: 'relative'
                }}
              >
                <SafeImage 
                  src={displayImages[currentImageIndex]} 
                  alt={product.product_name} 
                  className={styles.mainProductImg}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: isSold ? 0.5 : 1 }} 
                />
                
                {/* ★追加: 売り切れバッジ */}
                {isSold && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '0', height: '0', borderTop: '100px solid #ea352d', borderRight: '100px solid transparent' }}>
                    <span style={{ position: 'absolute', top: '-75px', left: '10px', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', transform: 'rotate(-45deg)' }}>SOLD</span>
                  </div>
                )}

                <div className={styles.imageIndicator}>
                  {currentImageIndex + 1} / {displayImages.length}
                </div>
              </div>

              {displayImages.length > 1 && (
                <button className={styles.imgNext} onClick={handleNextImage}>&gt;</button>
              )}
            </div>
          </div>

          <div className={styles.rightColumn}>
            <h2>商品情報</h2>
            <table className={styles.productInfoTable}>
              <tbody>
                <tr><th>商品名</th><td>{product.product_name}</td></tr>
                <tr><th>カテゴリ</th><td>{product.category}</td></tr>
                <tr><th>プラットフォーム</th><td>{product.platform}</td></tr>
                <tr><th>商品の状態</th><td>{product.condition}</td></tr>
                <tr><th>配送方法</th><td>{product.shipping}</td></tr>
                <tr><th>発送までの日数</th><td>{product.days}</td></tr>
              </tbody>
            </table>

            <h2>注文内容</h2>
            <table className={styles.orderSummaryTable}>
              <tbody>
                <tr><td>小計</td><td>¥{product.price.toLocaleString()}</td></tr>
                <tr><td>送料</td><td>¥0</td></tr>
                <tr className={styles.totalRow}><td>合計</td><td>¥{product.price.toLocaleString()}</td></tr>
              </tbody>
            </table>

            <h2>商品の説明</h2>
            <p className={styles.description}>
              {product.description || "説明はありません。"}
            </p>

            <h2 className={styles.sellerHeader}>出品者</h2>
            <div className={styles.sellerInfo} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #eee' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#b0bec5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {getSellerInitials()}
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
                {sellerName}
              </span>
            </div>

            <div className={styles.buttons}>
              {/* ★変更: 売り切れの場合はいいねボタンを無効化 */}
              <button 
                id="like-btn" 
                className={`${styles.actionBtn} ${styles.likeBtn}`}
                onClick={handleLikeToggle}
                disabled={isSeller || isSold} // 売り切れ時も無効
                style={{
                  backgroundColor: isLiked ? '#fce4e4' : '#fff',
                  color: isLiked ? '#ea352d' : '#333',
                  border: isLiked ? '1px solid #ea352d' : '1px solid #ccc',
                  transition: 'all 0.2s',
                  opacity: (isSeller || isSold) ? 0.5 : 1, // 売り切れ時半透明に
                  cursor: (isSeller || isSold) ? 'not-allowed' : 'pointer'
                }}
              >
                <i className={isLiked ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i> 
                いいね！ {likeCount > 0 && <span style={{marginLeft: '4px', fontWeight: 'bold'}}>{likeCount}</span>}
              </button>

              {/* ★変更: 売り切れの場合は購入ボタンを無効化 */}
              {isSeller ? (
                <Link to={`/listing/edit/${id}`} className={`${styles.actionBtn} ${styles.buyBtn}`} style={{ backgroundColor: '#888', borderColor: '#888' }}>
                  編集する
                </Link>
              ) : isSold ? (
                <button className={`${styles.actionBtn} ${styles.buyBtn}`} disabled style={{ backgroundColor: '#ccc', borderColor: '#ccc', cursor: 'not-allowed', color: '#666' }}>
                  売り切れました
                </button>
              ) : (
                <Link to={`/kakunin/${id}`} className={`${styles.actionBtn} ${styles.buyBtn}`}>
                  購入手続きへ
                </Link>
              )}
            </div>

            <div className={styles.commentSection}>
              <h2>コメント</h2>
              <div className={styles.commentList}>
                {commentsList.length === 0 ? (
                  <p className={styles.noComments}>コメントはまだありません。</p>
                ) : (
                  commentsList.map((c) => (
                    <div key={c.id} className={styles.commentItem} style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#cfd8dc', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', flexShrink: 0 }}>
                        {getInitials(c.f_username)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{c.f_username}</span>
                          <span style={{ fontSize: '0.8rem', color: '#888' }}>
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '8px', position: 'relative' }}>
                          {c.comment}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* 売り切れの場合はコメント入力フォームを非表示 */}
              {isSold ? (
                <div style={{ padding: '20px', backgroundColor: '#f9f9f9', textAlign: 'center', borderRadius: '8px', border: '1px solid #ddd', color: '#666', marginTop: '20px' }}>
                  <i className="fa-solid fa-lock" style={{ marginRight: '8px' }}></i>
                  売り切れのため、コメントの投稿はできません。
                </div>
              ) : (
                <form onSubmit={handleCommentSubmit} className={styles.commentForm}>
                  <h3>コメントを投稿する</h3>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="コメントを入力してください..." 
                    required
                  />
                  <button type="submit" className={styles.submitCommentBtn}>投稿</button>
                </form>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;