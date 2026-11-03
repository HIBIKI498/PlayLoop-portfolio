import { apiFetch, API_BASE_URL } from '../../api';
import SafeImage from '../SafeImage';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import styles from '../../css/Forum.module.css'; 

interface ForumPost {
  id: number;
  title: string;
  category: string;
  content: string;
  image_url: string | null;
  f_username: string;
  created_at: string;
  like_count: number;
  comment_count: number;
}

type SortOrder = "newest" | "weekly_popular" | "yearly_popular";

const Forum: React.FC = () => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  
  const navigate = useNavigate();

  const DEFAULT_IMAGE = ""; 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    
    apiFetch(`${API_BASE_URL}/api/forum/posts`)
      .then(res => res.json())
      .then(data => setPosts(data))
      .catch(err => console.error("取得エラー", err));

    return () => unsubscribe();
  }, []);

  const handleCreateClick = () => {
    if (!user) {
      alert("投稿するにはログインしてください");
      return;
    }
    navigate('/forum/create');
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return DEFAULT_IMAGE;
    if (imagePath.startsWith('http')) return imagePath;
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `${API_BASE_URL}/${cleanPath}`;
  };

  const getSortedPosts = () => {
    const now = new Date().getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    return [...posts].filter(post => {
      const postTime = new Date(post.created_at).getTime();
      if (sortOrder === "weekly_popular") return now - postTime <= oneWeek;
      if (sortOrder === "yearly_popular") return now - postTime <= oneYear;
      return true; 
    }).sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        const scoreA = a.like_count + a.comment_count;
        const scoreB = b.like_count + b.comment_count;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  };

  const displayedPosts = getSortedPosts();

  return (
    <div className={styles.container}>
      
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>掲示板</h1>
          
          <div className={styles.filterGroup}>
            <button
              onClick={() => setSortOrder("newest")}
              className={`${styles.filterBtn} ${sortOrder === "newest" ? styles.activeFilterBtn : ""}`}
            >
              新規順
            </button>
            <button
              onClick={() => setSortOrder("weekly_popular")}
              className={`${styles.filterBtn} ${sortOrder === "weekly_popular" ? styles.activeFilterBtn : ""}`}
            >
              週間人気順
            </button>
            <button
              onClick={() => setSortOrder("yearly_popular")}
              className={`${styles.filterBtn} ${sortOrder === "yearly_popular" ? styles.activeFilterBtn : ""}`}
            >
              年間人気順
            </button>
          </div>
        </div>

        <button onClick={handleCreateClick} className={styles.createBtn}>
          ＋ 新規スレッド
        </button>
      </div>

      <div className={styles.listContainer}>
        {displayedPosts.length === 0 ? (
          <div className={styles.emptyState}>
            {sortOrder === "newest" ? "スレッドがありません。" : "指定された期間内にスレッドがありません。"}
          </div>
        ) : (
          displayedPosts.map(post => (
            <Link to={`/forum/toukou/${post.id}`} key={post.id} className={styles.postCard}>
              <div className={styles.imageWrapper}>
                <SafeImage 
                  src={getImageUrl(post.image_url)} 
                  alt={post.title} 
                  className={styles.postImage}

                />
              </div>

              <div className={styles.textContainer}>
                <div className={styles.metaTop}>
                  <span className={styles.categoryTag}>{post.category || '未分類'}</span>
                  <span className={styles.date}>{new Date(post.created_at).toLocaleString()}</span>
                </div>
                
                <h2 className={styles.postTitle}>{post.title}</h2>
                <p className={styles.postExcerpt}>{post.content}</p>

                <div className={styles.metaBottom}>
                  <span className={styles.author}>投稿者: {post.f_username || '名無し'}</span>
                  <div className={styles.stats}>
                    <span className={styles.likeStat}><i className="fa-solid fa-thumbs-up"></i> {post.like_count}</span>
                    <span className={styles.commentStat}><i className="fa-solid fa-comment"></i> {post.comment_count}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Forum;