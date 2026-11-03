// src/components/Account/Login.tsx
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import '../../css/Account.css';

interface FirebaseError {
  code: string;
  message: string;
}

function Login() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
        setError("メールアドレスとパスワードを入力してください");
        return;
    }

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      navigate('/complete'); 
    } catch (err) {
      console.error("Login Error:", err);
      const firebaseError = err as FirebaseError;

      if (firebaseError.code === 'auth/invalid-credential' || 
          firebaseError.code === 'auth/user-not-found' || 
          firebaseError.code === 'auth/wrong-password' ||
          firebaseError.code === 'auth/invalid-email') {
        setError('メールアドレスまたはパスワードが間違っています。');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setError('ログインの試行回数が多すぎます。しばらく待ってから再度お試しください。');
      } else {
        setError('ログインに失敗しました。');
      }
    }
  };

  return (
    <div className="container">
      {/* プログレスバーを削除しました */}

      <h2>ログイン</h2>
      
      {error && <p style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">メールアドレス</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            placeholder="example@example.com" 
            required 
            onChange={handleChange} 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">パスワード</label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            placeholder="パスワードを入力" 
            required 
            onChange={handleChange} 
          />
        </div>
        
        <div className="btn-container" style={{ justifyContent: 'center', marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>ログインする</button>
        </div>
      </form>

      <div className="register-prompt">
        <p>まだアカウントをお持ちではありませんか？</p>
        <Link to="/kanin_touroku" className="btn btn-secondary register-link-btn">新規登録はこちら</Link>
      </div>
    </div>
  );
}

export default Login;