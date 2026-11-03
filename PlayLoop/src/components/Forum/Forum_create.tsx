import { apiFetch, API_BASE_URL } from '../../api';
import SafeImage from '../SafeImage';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import styles from '../../css/ForumCreate.module.css';

const CATEGORIES = ["雑談", "攻略・質問", "思い出", "購入相談", "その他"];

const ForumCreate: React.FC = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("雑談");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  const navigate = useNavigate();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        alert("ログインが必要です");
        navigate('/forum');
      } else {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !content.trim()) {
      alert("タイトルと本文を入力してください");
      return;
    }

    const formData = new FormData();
    formData.append('author_uid', user.uid);
    formData.append('title', title);
    formData.append('content', content);
    formData.append('category', category);
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/forum/posts`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        navigate('/forum');
      } else {
        alert("投稿に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("通信エラーが発生しました");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>新規スレッド作成</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        
        <div className={styles.formGroup}>
          <label className={styles.label}>画像（任意・1枚のみ）</label>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleImageChange}
            className={`${styles.input} ${styles.imageInput}`}
          />
          {previewUrl && (
            <div className={styles.previewWrapper}>
              <SafeImage src={previewUrl} alt="プレビュー" className={styles.previewImage} />
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>カテゴリー</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className={styles.input}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>タイトル</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="スレッドのタイトルを入力"
            maxLength={100}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>本文</label>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="書き込み内容を入力してください"
            rows={8}
            className={`${styles.input} ${styles.textarea}`}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button type="button" onClick={() => navigate('/forum')} className={styles.cancelBtn}>
            キャンセル
          </button>
          <button type="submit" className={styles.submitBtn}>
            投稿する
          </button>
        </div>
      </form>
    </div>
  );
};

export default ForumCreate;