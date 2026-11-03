import { apiFetch, API_BASE_URL } from '../../api';
import SafeImage from '../SafeImage';
// src/components/Account/Listing_kakunin.tsx

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import styles from '../../css/ListingKakunin.module.css'; // ★CSSインポート
import '../../css/Listing.css';

const ListingKakunin: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 入力画面から渡されたデータ
  const formData = location.state;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // データがない場合は入力画面に戻す
  if (!formData) {
    return (
      <div className={styles.container}>
        <p style={{ textAlign: 'center', fontWeight: 'bold' }}>データが見つかりません。最初からやり直してください。</p>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => navigate('/Listing')} className={styles.btnModify}>
            出品画面へ戻る
          </button>
        </div>
      </div>
    );
  }

  const {
    images, productName, category, condition, platform,
    shipping, region, days, description, price
  } = formData;

  const displayDescription = (!description || description.trim() === "") 
    ? "商品説明はありません" 
    : description;

  // 出品実行処理
  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("ログインセッションが切れました。再ログインしてください。");
        navigate("/create-account");
        return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append("uid", user.uid);

      if (images && images.length > 0) {
        images.forEach((img: File) => submitData.append("images", img));
      }

      submitData.append("productName", productName);
      submitData.append("category", category);
      submitData.append("condition", condition);
      submitData.append("platform", platform);
      submitData.append("shipping", shipping);
      submitData.append("region", region);
      submitData.append("days", days);
      submitData.append("description", displayDescription); 
      submitData.append("price", price);

      // API送信
      const res = await apiFetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        body: submitData,
      });

      if (!res.ok) throw new Error("登録失敗");

      // 成功したら完了画面へ
      navigate("/listing/kanryou");

    } catch (err) {
      console.error(err);
      alert("出品処理に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>出品内容の確認</h1>
      <p className={styles.pageDesc}>
        以下の内容で出品します。よろしければ「出品する」ボタンを押してください。
      </p>

      {/* プレビュー表示エリア */}
      <div className={styles.detailsCard}>
        
        {/* 画像プレビュー */}
        <div className={styles.formGroup}>
            <span className={styles.label}>出品画像</span>
            <div className={styles.imageContainer}>
                {images && images.map((img: File, idx: number) => (
                    <SafeImage 
                        key={idx}
                        src={URL.createObjectURL(img)} 
                        alt="preview" 
                        className={styles.imagePreview}
                    />
                ))}
            </div>
        </div>

        {/* 商品名 */}
        <div className={styles.formGroup}>
            <span className={styles.label}>商品名</span>
            <p className={styles.value}>{productName}</p>
        </div>

        {/* 2列レイアウト (カテゴリー / プラットフォーム) */}
        <div className={styles.row2}>
            <div className={styles.col45}>
                <span className={styles.label}>カテゴリー</span>
                <p className={styles.value}>{category}</p>
            </div>
            <div className={styles.col45}>
                <span className={styles.label}>プラットフォーム</span>
                <p className={styles.value}>{platform}</p>
            </div>
        </div>

        {/* 2列レイアウト (状態 / 価格) */}
        <div className={styles.row2}>
            <div className={styles.col45}>
                <span className={styles.label}>商品の状態</span>
                <p className={styles.value}>{condition}</p>
            </div>
            <div className={styles.col45}>
                <span className={styles.label}>価格</span>
                <p className={styles.priceValue}>
                    ¥{parseInt(price).toLocaleString()}
                </p>
            </div>
        </div>

        {/* 商品説明 */}
        <div className={styles.formGroup}>
            <span className={styles.label}>商品説明</span>
            <p className={styles.descriptionValue}>
                {displayDescription}
            </p>
        </div>

        {/* 3列レイアウト (発送関連) */}
        <div className={styles.row3}>
            <div className={styles.col30}>
                <span className={styles.label}>発送元の地域</span>
                <p className={styles.smallValue}>{region}</p>
            </div>
            <div className={styles.col30}>
                <span className={styles.label}>配送方法</span>
                <p className={styles.smallValue}>{shipping}</p>
            </div>
            <div className={styles.col30}>
                <span className={styles.label}>発送までの日数</span>
                <p className={styles.smallValue}>{days}</p>
            </div>
        </div>

      </div>

      {/* ボタンエリア */}
      <div className={styles.btnContainer}>
        <button 
          onClick={() => navigate('/Listing', { state: formData })} 
          disabled={isSubmitting}
          className={styles.btnModify}
        >
          修正する
        </button>

        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className={styles.btnSubmit}
        >
          {isSubmitting ? '出品処理中...' : '出品する'}
        </button>
      </div>
    </div>
  );
};

export default ListingKakunin;