import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../../css/Touroku.css'; 

const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [error, setError] = useState('');
  // ★追加: 通信中の連打防止用フラグ

  // 確認画面から戻ってきた時のデータ復元
  useEffect(() => {
    if (location.state) {
      const { error: errorMsg, ...savedData } = location.state;
      if (savedData.email) {
         setFormData(prev => ({ ...prev, ...savedData }));
      }
      if (errorMsg) {
        setError(errorMsg);
      }
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  // ★修正: async 関数に変更
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // クライアント側バリデーション
    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }
    
    if (!formData.agreeTerms) {
      setError("利用規約に同意してください。");
      return;
    }

    navigate('/register/confirm', { state: formData });

  };

  return (
    <div className="registration-container">
      <h1>新規会員登録</h1>
      
      {/* エラー表示 */}
      {error && (
        <div style={{ 
          color: '#721c24', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb',
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '5px',
          fontSize: '0.9em',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">ユーザー名 <span className="required">必須</span></label>
          <input 
            type="text" 
            id="username" 
            name="username" 
            maxLength={20} 
            placeholder="例: 山田太郎" 
            required 
            value={formData.username}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">メールアドレス <span className="required">必須</span></label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            placeholder="user@example.invalid" 
            required 
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">パスワード <span className="required">必須</span></label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            minLength={8} 
            placeholder="半角英数字8文字以上" 
            required 
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">パスワード（確認） <span className="required">必須</span></label>
          <input 
            type="password" 
            id="confirmPassword" 
            name="confirmPassword" 
            required 
            value={formData.confirmPassword}
            onChange={handleChange}
          />
        </div>
        
        <div className="terms">
          <input 
            type="checkbox" 
            id="agreeTerms" 
            name="agreeTerms" 
            required 
            checked={formData.agreeTerms}
            onChange={handleChange}
          />
          <label htmlFor="agreeTerms">
            <a href="#" target="_blank" rel="noreferrer">利用規約</a>と
            <a href="#" target="_blank" rel="noreferrer">プライバシーポリシー</a>に同意する
          </label>
        </div>
        
        <button type="submit" className="register-btn">
          内容を確認する
        </button>
      </form>
      
      <p className="login-link">
        アカウントをお持ちですか？ <Link to="/create-account">ログインはこちら</Link>
      </p>
    </div>
  );
};

export default Register;