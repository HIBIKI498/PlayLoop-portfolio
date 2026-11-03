import { apiFetch, API_BASE_URL } from '../api';
import SafeImage from './SafeImage';
// src/components/Home.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from '../firebase'; 
import '../css/Home.css'; 

// 商品の型定義
interface Product {
    id: number;
    product_name: string;
    price: number;
    image_urls: string | string[];
    platform: string;
    favorite_count?: number; 
    status?: string;       // ★追加: 売り切れ判定用
    buyer_uid?: string | null; // ★追加: 売り切れ判定用
}

const PLATFORMS_MAP: Record<string, string[]> = {
  "任天堂": ["ファミコン", "スーファミ", "ゲームボーイ", "６４", "DS / 3DS", "Wii / WiiU"],
  "PlayStation": ["PS", "PS2", "PS3", "PS4"],
  "Xbox": ["Xbox", "Xbox 360", "Xbox One", "series X / S"],
  "SEGA": ["セガ・マークIII", "メガドライブ", "セガサターン", "ドリームキャスト"]
};

const Home: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    
    const [hotProducts, setHotProducts] = useState<Product[]>([]);       
    const [newProducts, setNewProducts] = useState<Product[]>([]);       
    const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]); 
    
    const [selectedMaker, setSelectedMaker] = useState<string | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);


    // 1. ログイン状態の監視
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. ログインしている場合、各種データを取得
    useEffect(() => {
        if (user) {
            // ★売り切れを判定する共通の関数
            const isSoldOut = (p: Product) => p.status === 'sold' || p.status === '売り切れ' || !!p.buyer_uid;

            // ① 新着順
            apiFetch(`${API_BASE_URL}/api/products`)
                .then(res => res.json())
                .then((data: Product[]) => {
                    // ★売り切れの商品を除外
                    setNewProducts(data.filter(p => !isSoldOut(p)));
                })
                .catch(err => console.error(err));

            // ② 注目商品
            apiFetch(`${API_BASE_URL}/api/products/hot`)
                .then(res => res.json())
                .then((data: Product[]) => {
                    // ★売り切れの商品を除外
                    setHotProducts(data.filter(p => !isSoldOut(p)));
                })
                .catch(err => console.error(err));

            // ③ 自分がいいねした商品
            apiFetch(`${API_BASE_URL}/api/my-favorites?uid=${user.uid}`)
                .then(res => res.json())
                .then((data: Product[]) => {
                    // ★売り切れの商品を除外
                    setFavoriteProducts(data.filter(p => !isSoldOut(p)));
                })
                .catch(err => console.error(err));
        }
    }, [user]);

    // --- 各セクション用のデータ抽出 (最大8件) ---
    const displayHotProducts = hotProducts.slice(0, 8);
    const displayNewProducts = newProducts.slice(0, 8);
    const displayFavoriteProducts = favoriteProducts.slice(0, 8);

    const platformFilteredProducts = selectedPlatform 
        ? newProducts.filter(p => p.platform === selectedPlatform)
        : [];
    const displayPlatformProducts = platformFilteredProducts.slice(0, 8);

    // --- イベントハンドラ ---
    const handleMakerClick = (maker: string) => {
        if (selectedMaker === maker) {
            setSelectedMaker(null); 
            setSelectedPlatform(null);
        } else {
            setSelectedMaker(maker); 
            setSelectedPlatform(null); 
        }
    };

    const handlePlatformClick = (platform: string) => {
        setSelectedPlatform(platform);
    };

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

    // ★ 共通の商品カード
    const renderProductCard = (item: Product, prefix: string) => (
        <Link to={`/product/${item.id}`} key={`${prefix}-${item.id}`} className="home-product-card">
            <div className="home-product-image-wrapper">
                <SafeImage src={getImageUrl(item.image_urls)} alt={item.product_name} />
            </div>
            <div className="home-product-info">
                <h3 className="home-product-name">{item.product_name}</h3>
                <div className="home-product-price-row">
                    <p className="home-product-price">¥{item.price.toLocaleString()}</p>
                    
                    {item.favorite_count !== undefined && (
                        <span className="home-product-favorite">
                            <i className="fa-solid fa-heart"></i> {item.favorite_count}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );

    if (loadingAuth) {
        return <div className="main-content loading-container">読み込み中...</div>;
    }

    if (!user) {
        return (
            <main className="main-content">
                <section className="hero-section">
                    <div className="hero-content">
                        <h1 className="hero-title">昔と今をつなげる</h1><br />
                        <h2 className="hero-subtitle">ゲーム特化のCtoCサイト</h2>
                        <p className="hero-description">
                            PCゲームが流行る昨今、<br />昔のゲームをプレイしたいと思うことはありませんか？<br />そんなあなたに、<br />PLAYLOOPは昔のゲームを簡単に売買できるプラットフォームを提供します。<br />さあ、PLAYLOOPであなたのゲームライフを始めましょう！
                        </p>
                    </div>
                </section>

                <section className="features-section">
                    <h2 className="section-title">PLAYLOOPの使い方</h2>
                    <p className="section-subtitle">下部のメニューアイコンから、以下の各機能をご利用いただけます。</p>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon"><i className="fa-solid fa-magnifying-glass"></i></div>
                            <h3 className="feature-title">さがす</h3>
                            <p className="feature-desc">キーワード、カテゴリー、商品の状態やハードなどから、あなたにぴったりのレトロゲームを探すことができます。</p>
                            <Link to="/search" className="feature-link">検索ページへ &gt;</Link>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon"><i className="fa-solid fa-camera"></i></div>
                            <h3 className="feature-title">出品する</h3>
                            <p className="feature-desc">遊び終わったゲームを簡単に出品。写真をアップロードして、商品の状態や価格を設定するだけで完了します。</p>
                            <Link to="/create-account" className="feature-link login-link">
                                ログインしてください &gt;
                            </Link>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon"><i className="fa-solid fa-user"></i></div>
                            <h3 className="feature-title">マイページ</h3>
                            <p className="feature-desc">いいねした商品、出品した商品、購入履歴の確認や、プロフィールの編集など、あなたのアカウント情報を管理します。</p>
                            <Link to="/create-account" className="feature-link login-link">
                                ログインしてください &gt;
                            </Link>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon"><i className="fa-solid fa-comments"></i></div>
                            <h3 className="feature-title">掲示板</h3>
                            <p className="feature-desc">思い出のゲームについて語り合ったり、攻略情報を交換したり、レトロゲームファン同士で交流できるコミュニティです。</p>
                            <Link to="/create-account" className="feature-link login-link">
                                ログインしてください &gt;
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="main-content">
            
            <section className="dashboard-section">
                <h2 className="dashboard-title">注目商品</h2>
                <p className="dashboard-subtitle">現在いいねが多く集まっている商品です</p>

                {displayHotProducts.length > 0 ? (
                    <div className="product-grid">
                        {displayHotProducts.map(item => renderProductCard(item, 'hot'))}
                    </div>
                ) : (
                    <p className="no-items-msg">注目商品はまだありません。</p>
                )}

                {hotProducts.length > 8 && (
                    <div className="more-products-container">
                        <Link to="/search" className="more-products-link">さらに商品を表示する &gt;</Link>
                    </div>
                )}
            </section>

            <section className="dashboard-section platform-section">
                <h2 className="dashboard-title">ハードから探す</h2>
                <p className="dashboard-subtitle">メーカーとゲーム機を選んでください</p>

                <div className="maker-buttons">
                    {Object.keys(PLATFORMS_MAP).map(maker => (
                        <button 
                            key={maker} 
                            className={`maker-btn ${selectedMaker === maker ? 'active' : ''}`}
                            onClick={() => handleMakerClick(maker)}
                        >
                            {maker}
                        </button>
                    ))}
                </div>

                {selectedMaker && (
                    <div className="platform-buttons">
                        {PLATFORMS_MAP[selectedMaker].map(platform => (
                            <button 
                                key={platform}
                                className={`platform-btn ${selectedPlatform === platform ? 'active' : ''}`}
                                onClick={() => handlePlatformClick(platform)}
                            >
                                {platform}
                            </button>
                        ))}
                    </div>
                )}

                {selectedPlatform && (
                    <div className="platform-results">
                        <h3 className="results-title">{selectedPlatform} の商品</h3>
                        
                        {displayPlatformProducts.length > 0 ? (
                            <>
                                <div className="product-grid">
                                    {displayPlatformProducts.map(item => renderProductCard(item, 'plat'))}
                                </div>
                                {platformFilteredProducts.length > 8 && (
                                    <div className="more-products-container">
                                        <Link 
                                            to="/search" 
                                            state={{ platform: selectedPlatform }} 
                                            className="more-products-link"
                                        >
                                            さらに商品を表示する &gt;
                                        </Link>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="no-items-msg platform-no-items">
                                このプラットフォームの商品はまだありません。
                            </p>
                        )}
                    </div>
                )}
            </section>

            {favoriteProducts.length > 0 && (
                <section className="dashboard-section">
                    <h2 className="dashboard-title">いいねした商品</h2>
                    <p className="dashboard-subtitle">あなたが「いいね」した商品の一覧です</p>

                    <div className="product-grid">
                        {displayFavoriteProducts.map(item => renderProductCard(item, 'fav'))}
                    </div>

                    {favoriteProducts.length > 8 && (
                        <div className="more-products-container">
                            <Link to="/mypage" className="more-products-link">マイページでさらに見る &gt;</Link>
                        </div>
                    )}
                </section>
            )}

            <section className="dashboard-section">
                <h2 className="dashboard-title">新着商品</h2>
                <p className="dashboard-subtitle">新しく出品された商品です</p>

                <div className="product-grid">
                    {displayNewProducts.map(item => renderProductCard(item, 'new'))}
                </div>

                {newProducts.length > 8 && (
                    <div className="more-products-container">
                        <Link to="/search" className="more-products-link">さらに商品を表示する &gt;</Link>
                    </div>
                )}
            </section>

        </main>
    );
};

export default Home;