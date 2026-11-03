import { apiFetch, API_BASE_URL } from '../../api';
import SafeImage from '../SafeImage';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import styles from '../../css/ForumToukou.module.css'; 

interface PostDetail {
  id: number;
  author_uid: string;
  title: string;
  content: string;
  category: string;
  image_url: string | null;
  created_at: string;
  f_username: string;
}

interface Comment {
  id: number;
  post_id: number;
  author_uid: string;
  content: string;
  image_url: string | null;
  created_at: string;
  f_username: string;
}

interface QuoteData {
  username: string;
  text: string;
  imageUrl: string | null;
}

const ForumToukou: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState<User | null>(null);
  
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const [commentPreviewUrl, setCommentPreviewUrl] = useState<string | null>(null);

  const [quotedComment, setQuotedComment] = useState<QuoteData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const DEFAULT_IMAGE = "";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      if (commentPreviewUrl) URL.revokeObjectURL(commentPreviewUrl);
    };
  }, [commentPreviewUrl]);

  const fetchData = useCallback(() => {
    apiFetch(`${API_BASE_URL}/api/forum/posts/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Not Found");
        return res.json();
      })
      .then(data => {
        setPost(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    apiFetch(`${API_BASE_URL}/api/forum/posts/${id}/comments`)
      .then(res => res.json())
      .then(data => setComments(data))
      .catch(err => console.error(err));
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let url = `${API_BASE_URL}/api/forum/posts/${id}/likes`;
    if (user) url += `?uid=${user.uid}`;
    
    apiFetch(url)
      .then(res => res.json())
      .then(data => {
        setIsLiked(data.isLiked);
        setLikeCount(data.count);
      })
      .catch(err => console.error(err));
  }, [id, user]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("コメントを投稿するにはログインしてください");
      return;
    }
    if (!newComment.trim()) return;

    let finalContent = newComment;
    if (quotedComment) {
      let quoteText = `> ${quotedComment.username}さんの書き込み:\n`;
      if (quotedComment.imageUrl) {
        quoteText += `> [quote_image:${quotedComment.imageUrl}]\n`;
      }
      quoteText += `> ${quotedComment.text.split('\n').join('\n> ')}\n\n`;
      finalContent = quoteText + finalContent;
    }

    const formData = new FormData();
    formData.append('author_uid', user.uid);
    formData.append('content', finalContent); 
    if (commentImageFile) {
      formData.append('image', commentImageFile);
    }

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/forum/posts/${id}/comments`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setNewComment(""); 
        setCommentImageFile(null);
        setCommentPreviewUrl(null);
        setQuotedComment(null); 
        setIsModalOpen(false); 
        fetchData();
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      } else {
        alert("コメントの投稿に失敗しました");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCommentImageFile(file);
      setCommentPreviewUrl(URL.createObjectURL(file));
    } else {
      setCommentImageFile(null);
      setCommentPreviewUrl(null);
    }
  };

  const handleLikeToggle = async () => {
    if (!user) {
      alert("リアクションするにはログインしてください");
      return;
    }
    try {
      if (isLiked) {
        const res = await apiFetch(`${API_BASE_URL}/api/forum/posts/${id}/likes`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid })
        });
        if (res.ok) {
          setIsLiked(false);
          setLikeCount(prev => prev - 1);
        }
      } else {
        const res = await apiFetch(`${API_BASE_URL}/api/forum/posts/${id}/likes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid })
        });
        if (res.ok) {
          setIsLiked(true);
          setLikeCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getInitials = (name: string) => {
    return (name || "U").slice(0, 2).toUpperCase();
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return DEFAULT_IMAGE;
    if (imagePath.startsWith('http')) return imagePath;
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `${API_BASE_URL}/${cleanPath}`;
  };

  const handleQuote = (username: string, text: string, imageUrl: string | null = null) => {
    setQuotedComment({ username, text, imageUrl });
    setIsModalOpen(true); 
  };

  const renderContentWithQuotes = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let quoteBlock: React.ReactNode[] = [];
    let isQuoting = false;

    lines.forEach((line, index) => {
      if (line.trim().startsWith('>') || line.trim().startsWith('＞')) {
        isQuoting = true;
        const cleanLine = line.replace(/^[>＞]\s*/, ''); 
        
        const imgMatch = cleanLine.match(/\[quote_image:(.*?)\]/);
        if (imgMatch) {
          quoteBlock.push(
            <div key={`img-${index}`} className={styles.quoteImageWrapper}>
              <SafeImage src={getImageUrl(imgMatch[1])} alt="引用画像" className={styles.quoteImage} />
            </div>
          );
        } else {
          quoteBlock.push(
            <div key={`text-${index}`} className={styles.textLine}>{cleanLine}</div>
          );
        }
      } else {
        if (isQuoting) {
          elements.push(
            <div key={`quote-block-${index}`} className={styles.quoteBlock}>
              {quoteBlock}
            </div>
          );
          quoteBlock = [];
          isQuoting = false;
        }
        elements.push(<div key={`line-${index}`} className={styles.textLine}>{line}</div>);
      }
    });

    if (isQuoting && quoteBlock.length > 0) {
      elements.push(
        <div key={`quote-block-end`} className={styles.quoteBlock}>
          {quoteBlock}
        </div>
      );
    }

    return elements;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>読み込み中...</div>;
  if (!post) return <div style={{ textAlign: 'center', padding: '50px' }}>スレッドが見つかりません</div>;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <button onClick={() => navigate('/forum')} className={styles.backBtn}>
          <i className="fa-solid fa-chevron-left"></i> 掲示板一覧へ戻る
        </button>

        <div className={styles.postCard}>
          <div className={styles.postHeader}>
            <div className={styles.postMeta}>
              <span className={styles.categoryTag}>{post.category || '未分類'}</span>
              <span className={styles.postDate}>{new Date(post.created_at).toLocaleString()}</span>
            </div>
            <button 
              onClick={() => handleQuote(post.f_username || '名無し', post.content, post.image_url)}
              className={styles.quoteBtn}
            >
              <i className="fa-solid fa-reply"></i> 引用
            </button>
          </div>

          <h1 className={styles.postTitle}>{post.title}</h1>

          <div className={styles.userInfo}>
            <div className={styles.userIcon}>{getInitials(post.f_username)}</div>
            <span className={styles.userName}>{post.f_username || '名無し'}</span>
          </div>

          {post.image_url && (
            <div className={styles.postImageWrapper}>
              <SafeImage src={getImageUrl(post.image_url)} alt="スレッドの画像" className={styles.postImage} />
            </div>
          )}

          <div className={styles.postContent}>
            {renderContentWithQuotes(post.content)}
          </div>

          <div className={styles.likeBtnWrapper}>
            <button 
              onClick={handleLikeToggle}
              className={`${styles.likeBtn} ${isLiked ? styles.liked : ""}`}
            >
              <i className={isLiked ? "fa-solid fa-thumbs-up" : "fa-regular fa-thumbs-up"}></i> 
              いいね! {likeCount > 0 && <span>{likeCount}</span>}
            </button>
          </div>
        </div>

        <div className={styles.commentsSection}>
          <h2 className={styles.commentsTitle}>
            コメント ({comments.length})
          </h2>

          <div className={styles.commentsList}>
            {comments.length === 0 ? (
              <p className={styles.emptyComments}>まだコメントはありません。最初のコメントを投稿しましょう！</p>
            ) : (
              comments.map((c, index) => (
                <div key={c.id} className={styles.commentItem}>
                  <div className={styles.commentUserIcon}>{getInitials(c.f_username)}</div>
                  <div className={styles.commentContent}>
                    <div className={styles.commentHeader}>
                      <div className={styles.commentHeaderLeft}>
                        <span className={styles.commentIndexName}>{index + 1}. {c.f_username || '名無し'}</span>
                        <span className={styles.commentDate}>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <button 
                        onClick={() => handleQuote(c.f_username || '名無し', c.content, c.image_url)}
                        className={styles.quoteBtn}
                        style={{ border: 'none', background: '#eff4ff', color: '#357fd9' }}
                      >
                        <i className="fa-solid fa-reply"></i> 引用
                      </button>
                    </div>
                    
                    <div className={styles.commentBody}>
                      {renderContentWithQuotes(c.content)}
                      {c.image_url && (
                        <div className={styles.commentImageWrapper}>
                          <SafeImage src={getImageUrl(c.image_url)} alt="コメント添付画像" className={styles.commentImage} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button onClick={() => setIsModalOpen(false)} className={styles.closeModalBtn} title="閉じる">
              &times;
            </button>
            <h2 className={styles.modalTitle}>返信を投稿</h2>

            <form onSubmit={handleCommentSubmit}>
              {quotedComment && (
                <div className={styles.quotePreview}>
                  <button 
                    type="button" 
                    onClick={() => setQuotedComment(null)}
                    className={styles.removeQuoteBtn}
                    title="引用を取り消す"
                  >
                    &times;
                  </button>
                  <div className={styles.quotePreviewHeader}>
                    <i className="fa-solid fa-reply"></i> {quotedComment.username} さんの書き込みを引用中
                  </div>
                  {quotedComment.imageUrl && (
                    <div style={{ marginBottom: '10px' }}>
                      <SafeImage src={getImageUrl(quotedComment.imageUrl)} alt="引用元画像" style={{ maxHeight: '100px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                  )}
                  <div className={styles.quotePreviewText}>{quotedComment.text}</div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.imageInputLabel}>
                  <i className="fa-regular fa-image"></i> 画像を添付（任意）
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className={styles.imageInput}
                />
                {commentPreviewUrl && (
                  <div className={styles.modalPreviewWrapper}>
                    <SafeImage src={commentPreviewUrl} alt="プレビュー" className={styles.modalPreviewImage} />
                  </div>
                )}
              </div>

              <textarea 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="返信内容を入力してください..."
                rows={6}
                required
                className={styles.textarea}
              />
              
              <div className={styles.modalButtonGroup}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                  キャンセル
                </button>
                <button type="submit" className={styles.submitBtn}>
                  投稿する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.fabContainer}>
        <button onClick={scrollToTop} className={`${styles.fabBtn} ${styles.fabScroll}`} title="一番上へ移動">
          <i className="fa-solid fa-arrow-up"></i>
        </button>
        <button onClick={() => setIsModalOpen(true)} className={`${styles.fabBtn} ${styles.fabPrimary}`} title="返信する">
          <i className="fa-solid fa-pen"></i>
        </button>
        <button onClick={scrollToBottom} className={`${styles.fabBtn} ${styles.fabScrollDown}`} title="一番下へ移動">
          <i className="fa-solid fa-arrow-down"></i>
        </button>
      </div>
    </div>
  );
};

export default ForumToukou;