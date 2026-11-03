import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import '../../css/Account.css';

interface FirebaseError {
  code: string;
  message: string;
}


const Confirm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Login画面から渡されたデータを受け取る
  const { email, password, username } = location.state || {};
  const [error, setError] = useState('');

  // データがない場合（直接アクセスなど）のガード
  if (!email || !password) {
    return (
      <div className="container">
        <p>データが見つかりません。<a href="/create-account">ログイン画面</a>からやり直してください。</p>
      </div>
    );
  }

  const handleComplete = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/complete');
    } catch (err) { // 🔴 型注釈は書かない
      console.error("Login Error:", err);
      
      // 🔴 定義した型として扱う
      const firebaseError = err as FirebaseError;

      if (firebaseError.code === 'auth/invalid-credential' || firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
        setError('メールアドレスまたはパスワードが間違っています。');
      } else {
        setError('ログインに失敗しました。: ' + firebaseError.message);
      }
    }
  };

  return (
    <div className="container">
      <div className="progress-bar">
        <div className="step completed">
          <div className="step-circle"></div>
          <span className="step-text">認証</span>
        </div>
        <div className="progress-bar-line"></div>
        <div className="step active">
          <div className="step-circle"></div>
          <span className="step-text">確認</span>
        </div>
        <div className="progress-bar-line"></div>
        <div className="step">
          <div className="step-circle"></div>
          <span className="step-text">完了</span>
        </div>
      </div>
      
      <h2>ログイン内容の確認</h2>
      
      {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}

      <div className="confirmation-details">
        <p>メールアドレス: <span>{email}</span></p>
        {/* ユーザー名はログイン処理自体には不要ですが、表示用に受け取っていれば表示 */}
        {username && <p>ユーザー名: <span>{username}</span></p>}
        <p>パスワード: <span>********</span></p>
      </div>

      <div className="btn-container">
        {/* 戻るボタン */}
        <Link to="/create-account" className="btn btn-secondary">戻る</Link>
        <button onClick={handleComplete} className="btn btn-primary">ログインする</button>
      </div>
    </div>
  );
};

export default Confirm;