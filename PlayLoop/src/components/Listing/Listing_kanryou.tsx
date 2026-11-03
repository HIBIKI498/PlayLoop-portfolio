// src/components/Account/Listing_kanryou.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import '../../css/Account.css'; // コンテナ等のスタイル用

const ListingKanryou: React.FC = () => {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '50px 20px' }}>
      
      <div className="checkmark-circle" style={{ margin: '0 auto 20px' }}>
        <div className="checkmark"></div>
      </div>

      <h2 style={{ marginBottom: '10px' }}>出品が完了しました！</h2>
      <p style={{ color: '#666', marginBottom: '40px' }}>
        あなたの商品が出品されました。<br/>
        マイページで出品した商品を確認できます。
      </p>

      <div className="btn-container" style={{ flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
        <Link to="/mypage" className="btn btn-primary" style={{ width: '100%', boxSizing: 'border-box' }}>
          マイページへ移動
        </Link>
        <Link to="/" className="btn btn-secondary" style={{ width: '100%', boxSizing: 'border-box' }}>
          トップページへ戻る
        </Link>
      </div>
    </div>
  );
};

export default ListingKanryou;