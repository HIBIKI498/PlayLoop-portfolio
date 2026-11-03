import React from 'react';
import { Link } from 'react-router-dom';
import '../../css/Account.css';

const Complete: React.FC = () => {
  return (
    // 確認用
    <div className="container">
      {/* プログレスバーを削除しました */}

      <div className="checkmark-circle">
        <div className="checkmark"></div>
      </div>

      <h2>ログインが完了しました！</h2>
      <br />
      <Link to="/" className="btn btn-secondary">トップページへ</Link>
    </div>
  );
};

export default Complete;