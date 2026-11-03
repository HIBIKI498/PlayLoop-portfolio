import { apiFetch, API_BASE_URL } from '../api';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { User } from 'firebase/auth';
import '../css/Header.css';

interface HeaderProps {
  user: User | null;
}

function Header({ user }: HeaderProps) {
  const [dbUserName, setDbUserName] = useState<string>("");


  useEffect(() => {
    if (user) {
      apiFetch(`${API_BASE_URL}/api/users/${user.uid}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.f_username) {
            setDbUserName(data.f_username);
          }
        })
        .catch(err => console.error("ユーザー名取得エラー:", err));
    } else {
      setDbUserName("");
    }
  }, [user]);

  const getInitials = () => {
    const name = dbUserName || user?.displayName || user?.email || "User";
    return name.slice(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return dbUserName || user?.displayName || "ゲスト";
  };

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/"><span className="header-title-text">PlayLoop</span></Link>
      </div>
      <div className="header-nav">
        <nav className="nav-menu">
          <Link to="/"><i className="fa-solid fa-house"></i></Link>
          <Link to="/search"><i className="fa-solid fa-magnifying-glass"></i></Link>
          <Link to="/mypage"><i className="fa-solid fa-user"></i></Link>
          <Link to="/forum"><i className="fa-solid fa-comments"></i></Link>
          <Link to="/listing"><i className="fa-solid fa-box-open"></i></Link>
        </nav>
      </div>
      <div className="header-right">
        
        {user ? (
          // ログイン中：DBから取得した名前を表示
          <Link to="/mypage" className="user-link">
            <div className="user-icon-initials">
              {getInitials()}
            </div>
            <span className="user-text">
              {getDisplayName()}
            </span>
          </Link>
        ) : (
          // 未ログイン時に「新規登録」と「ログイン」を横に並べて表示
          <div className="auth-buttons">
            <Link to="/kanin_touroku" className="user-link signup-btn">
              <span className="user-text">新規登録</span>
            </Link>
            <Link to="/create-account" className="user-link login-btn">
              <span className="user-text">ログイン</span>
            </Link>
          </div>
        )}

        <Link to="/faq" className="help-link" style={{ marginLeft: '15px' }}>
          <div className="help-icon"><i className="fa-solid fa-question"></i></div>
        </Link>
      </div>
    </header>
  );
}

export default Header;