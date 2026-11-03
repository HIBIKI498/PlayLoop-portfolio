import { apiFetch, API_BASE_URL } from '../../api';
import SafeImage from '../SafeImage';
// src/components/Search/Search.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from '../../css/Search.module.css';

// データベース(T_PRODUCTS)に合わせた型定義
interface Product {
  id: number;
  seller_uid: string;
  product_name: string;
  category: string;
  condition: string;
  platform: string;
  price: number;
  description: string;
  image_urls: string | string[];
  created_at: string;
  favorite_count?: number; 
}

// フィルターの選択肢定義
const CATEGORIES = ["ゲーム機本体", "ゲーム・カセット", "周辺機器", "攻略本", "グッズ"];
const CONDITIONS = ["新品・未使用", "目立った傷や汚れなし", "やや傷や汚れあり", "傷や汚れあり", "状態が悪い"];

const Search: React.FC = () => {
  const location = useLocation();
  
  // --- State管理 ---
  const [products, setProducts] = useState<Product[]>([]); 
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // 検索・絞り込み条件
  const [searchQuery, setSearchQuery] = useState(""); 
  const [categoryFilter, setCategoryFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  
  // 並び順のState
  const [sortOrder, setSortOrder] = useState<"newest" | "popular">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 1ページあたりの表示件数


  // --- 1. データ取得 ---
  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/products`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data: Product[]) => {
        setProducts(data);
        setFilteredProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("データ取得エラー:", err);
        setLoading(false);
      });
  }, []);

  // --- 2. フィルタリングと並び替えロジック ---
  useEffect(() => {
    let result = [...products];

    // A. キーワード検索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const keywords = query.split(/\s+/);

      result = result.filter((item) => {
        const text = `${item.product_name} ${item.description}`.toLowerCase();
        return keywords.every((k) => text.includes(k));
      });
    }

    // B. カテゴリー絞り込み
    if (categoryFilter) {
      result = result.filter((item) => item.category === categoryFilter);
    }

    // C. 商品状態絞り込み
    if (conditionFilter) {
      result = result.filter((item) => item.condition === conditionFilter);
    }

    // D. プラットフォーム絞り込み
    if (platformFilter) {
      result = result.filter((item) => item.platform === platformFilter);
    }

    // E. 価格帯絞り込み
    if (priceFilter) {
      result = result.filter((item) => {
        if (priceFilter === 'lt-5000') return item.price < 5000;
        if (priceFilter === '5000-20000') return item.price >= 5000 && item.price <= 20000;
        if (priceFilter === 'gt-20000') return item.price > 20000;
        return true;
      });
    }

    // F. 並び替えロジック
    if (sortOrder === "popular") {
      result.sort((a, b) => {
        const countA = a.favorite_count || 0;
        const countB = b.favorite_count || 0;
        if (countB !== countA) {
          return countB - countA;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredProducts(result);
    setCurrentPage(1); 
  }, [searchQuery, categoryFilter, conditionFilter, platformFilter, priceFilter, sortOrder, products]);

  // --- 3. 画面が開かれた時のパラメータ受け取り ---
  useEffect(() => {
    if (location.state && location.state.platform) {
      setPlatformFilter(location.state.platform);
    }
  }, [location.state]);


  // --- イベントハンドラ ---
  const handleClear = () => {
    setSearchQuery("");
    setCategoryFilter("");
    setConditionFilter("");
    setPlatformFilter("");
    setPriceFilter("");
    setSortOrder("newest");
    setCurrentPage(1);
  };

  // 画像パスの整形ヘルパー
  const getImageUrl = (imagePath: string | string[]) => {
    let path = "";
    if (Array.isArray(imagePath)) {
        path = imagePath.length > 0 ? imagePath[0] : "";
    } else if (typeof imagePath === 'string') {
        try {
            if (imagePath.trim().startsWith('[')) {
                const parsed = JSON.parse(imagePath);
                path = parsed[0];
            } else {
                path = imagePath;
            }
        } catch {
            path = imagePath;
        }
    }
    
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.includes('uploads/')) {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${API_BASE_URL}/${cleanPath}`;
    }
    return path.startsWith('/') ? path : `/${path}`;
  };

  // 現在のページに表示するデータを切り出す
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // ページ切り替え処理（上部にスクロールさせる）
  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <div className={styles.brand}>
          <div className={styles.logo}></div>
          <span>出品検索</span>
        </div>

        {/* 検索バーエリア */}
        <div className={styles.searchbar}>

          <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value as "newest" | "popular")}
              className={styles.sortSelect}
            >
              <option value="newest">新着順</option>
              <option value="popular">注目順</option>
          </select>

          <div className={styles.inputWrapper}>
             <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`}></i>
            <input 
              type="text" 
              placeholder="キーワード（商品名・説明など）" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          
          <div className={styles.clearBtnWrapper}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleClear}>クリア</button>
          </div>
        </div>

        {/* 絞り込みエリア (セレクトボックス) */}
        <div className={styles.filters}>
          
          {/* カテゴリー */}
          <select 
            className={styles.filterSelect} 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">カテゴリー（すべて）</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* 商品の状態 */}
          <select 
            className={styles.filterSelect} 
            value={conditionFilter} 
            onChange={(e) => setConditionFilter(e.target.value)}
          >
            <option value="">状態（すべて）</option>
            {CONDITIONS.map(cond => (
              <option key={cond} value={cond}>{cond}</option>
            ))}
          </select>

          {/* プラットフォーム */}
          <select 
            className={styles.filterSelect} 
            value={platformFilter} 
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="">プラットフォーム（すべて）</option>
            <optgroup label="任天堂">
              <option value="ファミコン">ファミコン</option>
              <option value="スーファミ">スーファミ</option>
              <option value="ゲームボーイ">ゲームボーイ</option>
              <option value="６４">６４</option>
              <option value="DS / 3DS">DS / 3DS</option>
              <option value="Wii / WiiU">Wii / WiiU</option>
            </optgroup>
            <optgroup label="PlayStation">
              <option value="PS">PS</option>
              <option value="PS2">PS2</option>
              <option value="PS3">PS3</option>
              <option value="PS4">PS4</option>
            </optgroup>
            <optgroup label="Xbox">
              <option value="Xbox">Xbox</option>
              <option value="Xbox 360">Xbox 360</option>
              <option value="Xbox One">Xbox One</option>
              <option value="series X / S">series X / S</option>
            </optgroup>
            <optgroup label="SEGA">
              <option value="セガ・マークIII">セガ・マークIII</option>
              <option value="メガドライブ">メガドライブ</option>
              <option value="セガサターン">セガサターン</option>
              <option value="ドリームキャスト">ドリームキャスト</option>
            </optgroup>
          </select>

          {/* 価格帯 */}
          <select 
            className={styles.filterSelect} 
            value={priceFilter} 
            onChange={(e) => setPriceFilter(e.target.value)}
          >
            <option value="">価格帯（すべて）</option>
            <option value="lt-5000">〜 ¥5,000</option>
            <option value="5000-20000">¥5,000〜¥20,000</option>
            <option value="gt-20000">¥20,000 以上</option>
          </select>
        </div>

        <div className={styles.meta}>
          <span>全 {filteredProducts.length} 件</span>
          {/* 現在のページ数表示 */}
          {totalPages > 0 && (
            <span className={styles.pageCount}>
              （{indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredProducts.length)}件を表示中）
            </span>
          )}
        </div>

        {/* ページネーションUI（上部） */}
        {!loading && totalPages > 0 && (
          <div className={styles.pagination}>
            <button 
              onClick={() => paginate(currentPage - 1)} 
              disabled={currentPage === 1}
              className={styles.pageBtn}
            >
              &lt; 前へ
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
              <button 
                key={number} 
                onClick={() => paginate(number)}
                className={`${styles.pageBtn} ${currentPage === number ? styles.activePage : ''}`}
              >
                {number}
              </button>
            ))}

            <button 
              onClick={() => paginate(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className={styles.pageBtn}
            >
              次へ &gt;
            </button>
          </div>
        )}

        {/* 結果グリッド */}
        {loading ? (
            <div className={styles.empty}>読み込み中...</div>
        ) : (
            <div className={styles.grid}>
            {/* currentItems をマップする */}
            {currentItems.map((item) => {
                const displayImg = getImageUrl(item.image_urls);

                return (
                <Link to={`/product/${item.id}`} key={item.id} className={styles.card}>
                    <div className={styles.imageWrapper}>
                    <SafeImage 
                        src={displayImg} 
                        alt={item.product_name} 
                        className={styles.image}

                    />
                    </div>
                    
                    <div className={styles.row}>
                        <span className={`${styles.tag} ${styles.categoryTag}`}>
                            {item.category}
                        </span>
                        <span className={styles.tag}>
                            {item.platform}
                        </span>
                    </div>

                    <div className={styles.info}>
                        <h3 className={styles.name}>{item.product_name}</h3>
                        <div className={styles.details}>
                            <span className={styles.categoryBadge}>{item.condition}</span>
                        </div>

                        <div className={styles.priceRow}>
                            <p className={styles.price}>¥{item.price.toLocaleString()}</p>
                            
                            <span className={styles.favoriteCount}>
                                <i className="fa-solid fa-heart"></i> {item.favorite_count || 0}
                            </span>
                        </div>
                    </div>
                </Link>
                );
            })}
            </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className={styles.empty}>
            条件に合うアイテムが見つかりませんでした。
          </div>
        )}

        {/* ページネーションUI（下部） */}
        {!loading && totalPages > 0 && (
          <div className={styles.pagination}>
            <button 
              onClick={() => paginate(currentPage - 1)} 
              disabled={currentPage === 1}
              className={styles.pageBtn}
            >
              &lt; 前へ
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
              <button 
                key={number} 
                onClick={() => paginate(number)}
                className={`${styles.pageBtn} ${currentPage === number ? styles.activePage : ''}`}
              >
                {number}
              </button>
            ))}

            <button 
              onClick={() => paginate(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className={styles.pageBtn}
            >
              次へ &gt;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;