// PlayLoop/src/App.tsx

import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"; // 🔴 Navigateを追加
import "./css/App.css";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

// 共通コンポーネント
import Header from "./components/Header.tsx";
import Footer from "./components/Footer.tsx";

// ページコンポーネント
import Home from "./components/Home.tsx";
import Login from "./components/Account/Login.tsx";
import Complete from "./components/Account/Complete.tsx";
import Touroku from "./components/Account/Touroku.tsx";
import Touroku_henkou from "./components/Account/Touroku_henkou.tsx";
import TourokuConfirm from "./components/Account/TourokuConfirm.tsx";
import Mypage from "./components/Mypage/Mypage.tsx";
import Listing from "./components/Listing/Listing.tsx";
import ListingKakunin from "./components/Listing/Listing_kakunin.tsx";
import ListingKanryou from "./components/Listing/Listing_kanryou.tsx";
import ListingHensyu from "./components/Listing/Listing_hensyu.tsx";
import List from "./components/Account/List.tsx";
import Search from "./components/Search/Search.tsx";
import ProductPage from "./components/Purchase/kounyu.tsx"; 
import Kakunin from "./components/Purchase/Kakunin.tsx";
import PurchaseComplete from "./components/Purchase/kounyu_complete.tsx";
import Shiharai from "./components/Purchase/shiharai.tsx";
import Juusyo from "./components/Purchase/juusyo.tsx";
import Forum from './components/Forum/Forum';
import ForumCreate from './components/Forum/Forum_create';
import ForumToukou from './components/Forum/Forum_toukou'; 

// 🔴 認証ガード用コンポーネントの定義
// userが存在すればそのページを表示、なければログイン画面へリダイレクト
const RequireAuth = ({ user, children }: { user: User | null, children: React.ReactNode }) => {
  if (!user) {
    // replace={true} にすることで、ブラウザの「戻る」ボタンで無限ループするのを防ぎます
    return <Navigate to="/create-account" replace />;
  }
  return children;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ログイン状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        <Header user={user} />

        <Routes>
          {/* ===================================================== */}
          {/* ✅ 誰でもアクセス可能なページ (Public Routes)            */}
          {/* ===================================================== */}
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/create-account" element={<Login />} />
          <Route path="/kanin_touroku" element={<Touroku />} />


          
          {/* ※登録確認画面も、登録完了前（未ログイン状態）で通る可能性があるためPublicにしています */}
          <Route path="/register/confirm" element={<TourokuConfirm />} />


          {/* ===================================================== */}
          {/* 🔒 ログイン必須のページ (Private Routes)                 */}
          {/* RequireAuth で囲むことでアクセス制限をかけます             */}
          {/* ===================================================== */}
          
          {/* マイページ関連 */}
          <Route path="/mypage" element={
            <RequireAuth user={user}><Mypage /></RequireAuth>
          } />
          <Route path="/complete" element={
            <RequireAuth user={user}><Complete /></RequireAuth>
          } />
          <Route path="/touroku_henkou" element={
            <RequireAuth user={user}><Touroku_henkou /></RequireAuth>
          } />


          {/* 出品関連 */}
          <Route path="/Listing" element={
            <RequireAuth user={user}><Listing /></RequireAuth>
          } />
          <Route path="/ProductList" element={
            <RequireAuth user={user}><List /></RequireAuth>
          } />
          <Route path="listing/kakunin" element={
            <RequireAuth user={user}><ListingKakunin /></RequireAuth>
          } />
          <Route path="/listing/kanryou" element={
            <RequireAuth user={user}><ListingKanryou /></RequireAuth>
          } />
          <Route path="/listing/edit/:id" element={
            <RequireAuth user={user}><ListingHensyu /></RequireAuth>
          } />
          
          {/* 商品詳細・購入関連 */}
          <Route path="/kakunin/:id" element={
            <RequireAuth user={user}><Kakunin /></RequireAuth>
          } />
          <Route path="/Purchasecomplete" element={
            <RequireAuth user={user}><PurchaseComplete /></RequireAuth>
          } />
          <Route path="/shiharai" element={
            <RequireAuth user={user}><Shiharai /></RequireAuth>
          } />
          <Route path="/juusyo" element={
            <RequireAuth user={user}><Juusyo /></RequireAuth>
          } />

          {/* 掲示板など */}
          <Route path="/forum" element={
            <RequireAuth user={user}><Forum /></RequireAuth>
          } />
          <Route path="/forum/create" element={
            <RequireAuth user={user}><ForumCreate /></RequireAuth>
          } />
          <Route path="/forum/toukou/:id" element={
            <RequireAuth user={user}><ForumToukou /></RequireAuth>
          } />

          {/* 404ページ（ここは公開にしておくのが一般的ですが、制限も可能です） */}
          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
};

export default App;