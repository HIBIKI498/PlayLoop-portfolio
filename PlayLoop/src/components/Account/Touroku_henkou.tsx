import { apiFetch, API_BASE_URL } from '../../api';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase'; 
import { onAuthStateChanged, type User } from 'firebase/auth';
import styles from '../../css/Touroku_henkou.module.css';

const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  
  // フォームのState
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // メールアドレスは表示のみ
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        alert("ログインが必要です");
        navigate('/login');
      } else {
        setUser(currentUser);
        apiFetch(`${API_BASE_URL}/api/users/${currentUser.uid}`)
          .then(res => res.json())
          .then(data => {
            if (data) {
              setUsername(data.f_username || "");
              setEmail(data.f_mailaddress || currentUser.email || "");
            }
            setLoading(false);
          })
          .catch(err => {
            console.error("ユーザー情報取得エラー:", err);
            setLoading(false);
          });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!username.trim()) {
      setMessage({ type: 'error', text: "ユーザー名を入力してください" });
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/users/${user.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: "会員情報を更新しました！元の画面に戻ります..." });
        
        setTimeout(() => {
            navigate(-1);
        }, 1500);
        
      } else {
        setMessage({ type: 'error', text: "更新に失敗しました" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: "通信エラーが発生しました" });
    }
  };

  const getInitials = () => {
    return (username || "U").slice(0, 2).toUpperCase();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>読み込み中...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>会員情報の変更</h1>

      {message && (
        <div className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>
          {message.text}
        </div>
      )}

      <div className={styles.iconArea}>
        <div className={styles.icon}>
          {getInitials()}
        </div>
        <span className={styles.iconLabel}>現在のアイコン</span>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        
        <div className={styles.formGroup}>
          <label className={styles.label}>
            メールアドレス <span className={styles.subLabel}>(変更不可)</span>
          </label>
          <input 
            type="email" 
            value={email}
            disabled
            className={`${styles.input} ${styles.inputDisabled}`}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            ユーザー名 (ニックネーム)
          </label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="新しいユーザー名を入力"
            maxLength={30}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            className={styles.cancelBtn}
          >
            キャンセル
          </button>
          <button 
            type="submit" 
            className={styles.submitBtn}
          >
            変更を保存する
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEdit;