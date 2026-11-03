import { apiFetch, API_BASE_URL } from '../../api';
import SafeImage from '../SafeImage';
// src/components/Listing/Listing_hensyu.tsx

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth } from "../../firebase";
import "../../css/Listing.css"; 

const ListingHensyu: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); 
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // State
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [platform, setPlatform] = useState("");
  const [shipping, setShipping] = useState("");
  const [region, setRegion] = useState("");
  const [days, setDays] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  
  // 画像関連
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]); 

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // --- 1. 商品データの取得 ---
  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("商品が見つかりません");
        return res.json();
      })
      .then((data) => {
        const product = Array.isArray(data) ? data[0] : data;
        
        if (!product) {
            alert("商品情報の取得に失敗しました");
            navigate("/mypage");
            return;
        }

        // フォームに初期値をセット
        setProductName(product.product_name);
        setCategory(product.category);
        setCondition(product.condition);
        setPlatform(product.platform); // ★変更
        setShipping(product.shipping);
        setRegion(product.region);
        setDays(product.days);
        setDescription(product.description);
        setPrice(String(product.price));

        // 画像URLのパース
        try {
            if (typeof product.image_urls === 'string') {
                if (product.image_urls.startsWith('[')) {
                     setCurrentImages(JSON.parse(product.image_urls));
                } else {
                     setCurrentImages([product.image_urls]);
                }
            } else if (Array.isArray(product.image_urls)) {
                setCurrentImages(product.image_urls);
            }
        } catch (e) {
            console.error("画像パースエラー", e);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        alert("エラーが発生しました");
        navigate("/mypage");
      });
  }, [id, navigate]);


  // --- Validate関数 ---
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (newImages.length === 0 && currentImages.length === 0) {
        newErrors.images = "画像を1枚以上登録してください";
    }

    if (!productName.trim()) newErrors.productName = "商品名は必須です";
    if (productName.length > 100) newErrors.productName = "商品名は100文字以内で入力してください";
    if (!category) newErrors.category = "カテゴリーを選択してください";
    if (!condition) newErrors.condition = "商品の状態を選択してください";
    if (!platform) newErrors.platform = "プラットフォームを選択してください";
    if (!shipping) newErrors.shipping = "配送方法を選択してください";
    if (!region) newErrors.region = "発送元の地方を選択してください";
    if (!days) newErrors.days = "発送日数を選択してください";

    if (!price.trim()) {
      newErrors.price = "価格を入力してください";
    } else {
      const priceVal = parseInt(price, 10);
      if (isNaN(priceVal) || priceVal < 100 || priceVal > 500000) {
          newErrors.price = "価格は¥100〜¥500,000の範囲で設定してください";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- 更新処理 (Update) ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const user = auth.currentUser;
    if (!user) {
        alert("ログインしてください");
        navigate("/create-account");
        return;
    }

    if (!window.confirm("この内容で変更を保存しますか？")) return;

    try {
      const formData = new FormData();
      formData.append("uid", user.uid);
      formData.append("productName", productName);
      formData.append("category", category);
      formData.append("condition", condition);
      formData.append("platform", platform);
      formData.append("shipping", shipping);
      formData.append("region", region);
      formData.append("days", days);
      formData.append("description", description);
      formData.append("price", price);

      newImages.forEach((img) => formData.append("images", img));

      const res = await apiFetch(`${API_BASE_URL}/api/products/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) throw new Error("更新失敗");

      alert("商品情報を更新しました！");
      navigate("/mypage");
    } catch (err) {
      console.error(err);
      alert("更新に失敗しました");
    }
  };

  // --- 削除処理 (Delete) ---
  const handleDelete = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!window.confirm("本当にこの出品を取り消しますか？\nこの操作は取り消せません。")) return;

    try {
        const res = await apiFetch(`${API_BASE_URL}/api/products/${id}`, {
            method: "DELETE",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uid: user.uid }) 
        });

        if (!res.ok) throw new Error("削除失敗");

        alert("出品を取り消しました");
        navigate("/mypage");
    } catch (err) {
        console.error(err);
        alert("削除に失敗しました");
    }
  };

  // --- 画像選択ハンドラ ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    if (window.confirm("新しい画像を選択すると、既存の画像はすべて置き換わります。よろしいですか？")) {
        setNewImages(selected);
        setCurrentImages([]);
    } else {
        e.target.value = "";
    }
  };

  const getImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (path.includes('uploads/')) return `${API_BASE_URL}/${cleanPath}`;
    return `/${cleanPath}`;
  };

  if (loading) return <div className="container">読み込み中...</div>;

  return (
    <div className="container">
      <h1>出品内容の編集</h1>

      <form onSubmit={handleUpdate}>
        {/* 画像セクション */}
        <div className="form-group">
          <label>商品画像</label>
          <div className="upload-box">
             {currentImages.length > 0 && (
                 <div style={{marginBottom: '10px'}}>
                     <p style={{fontSize: '0.9em', color: '#666'}}>現在の画像:</p>
                     <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                        {currentImages.map((src, i) => (
                            <SafeImage key={i} src={getImageUrl(src)} alt="current" style={{width: '60px', height: '60px', objectFit: 'cover'}} />
                        ))}
                     </div>
                 </div>
             )}

            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImageSelect}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
            >
                画像を変更する（全て置き換え）
            </button>

            <div id="preview" style={{marginTop: '10px'}}>
              {newImages.map((img, index) => (
                <div key={index} className="image-wrapper">
                  <SafeImage src={URL.createObjectURL(img)} alt="new preview" className="preview-image" />
                </div>
              ))}
            </div>
            {errors.images && <div style={{ color: "red" }}>{errors.images}</div>}
          </div>
        </div>

        {/* 商品名 */}
        <div className="form-group">
          <label>商品名</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
          {errors.productName && <div style={{ color: "red" }}>{errors.productName}</div>}
        </div>

        {/* カテゴリー */}
        <div className="form-group">
          <label>カテゴリー</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">選択してください</option>
            <option>ゲーム機本体</option>
            <option>ゲーム・カセット</option>
            <option>周辺機器</option>
            <option>攻略本</option>
            <option>グッズ</option>
          </select>
        </div>

        {/* 状態 */}
        <div className="form-group">
          <label>商品の状態</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">選択してください</option>
            <option>新品・未使用</option>
            <option>目立った傷や汚れなし</option>
            <option>やや傷や汚れあり</option>
            <option>傷や汚れあり</option>
            <option>状態が悪い</option>
          </select>
        </div>

        {/* ★変更: プラットフォーム */}
        <div className="form-group">
          <label>プラットフォーム</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">選択してください</option>
            <optgroup label="任天堂">
              <option value="ファミコン">ファミコン</option>
              <option value="スーファミ">スーファミ</option>
              <option value="ゲームボーイ">ゲームボーイ</option>
              <option value="６４">６４</option>
              <option value="DS/3DS">DS/3DS</option>
              <option value="Wii/WiiU">Wii/WiiU</option>
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
              <option value="seriesX/S">seriesX/S</option>
            </optgroup>
            <optgroup label="SEGA">
              <option value="セガ・マークIII">セガ・マークIII</option>
              <option value="メガドライブ">メガドライブ</option>
              <option value="セガサターン">セガサターン</option>
              <option value="ドリームキャスト">ドリームキャスト</option>
            </optgroup>
          </select>
          {errors.platform && <div style={{ color: "red" }}>{errors.platform}</div>}
        </div>

        {/* 配送方法 */}
        <div className="form-group">
          <label>配送方法</label>
          <select value={shipping} onChange={(e) => setShipping(e.target.value)}>
            <option value="">選択してください</option>
            <option>ゆうパック</option>
            <option>宅急便</option>
            <option>定形外郵便</option>
            <option>クリックポスト</option>
          </select>
        </div>

        {/* 地域 */}
        <div className="form-group">
          <label>発送元の地方</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
             <option value="">選択してください</option>
            <option value="北海道">北海道</option>
            <option value="東北">東北</option>
            <option value="関東">関東</option>
            <option value="中部">中部</option>
            <option value="近畿">近畿</option>
            <option value="中国">中国</option>
            <option value="四国">四国</option>
            <option value="九州・沖縄">九州・沖縄</option>
          </select>
        </div>

        {/* 日数 */}
        <div className="form-group">
          <label>発送までの日数</label>
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="">選択してください</option>
            <option value="1-2日">1〜2日で発送</option>
            <option value="3-5日">3〜5日で発送</option>
            <option value="5-7日">5〜7日で発送</option>
          </select>
        </div>

        {/* 説明 */}
        <div className="form-group">
          <label>商品の説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
          />
        </div>

        {/* 価格 */}
        <div className="form-group">
          <label>価格</label>
          <input
            type="text"
            value={price}
            onChange={(e) => {
                 const val = e.target.value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
                 setPrice(val.replace(/[^0-9]/g, ''));
            }}
          />
          {errors.price && <div style={{ color: "red" }}>{errors.price}</div>}
        </div>

        <div className="btn-container" style={{display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px'}}>
             {/* 削除ボタン */}
            <button 
                type="button" 
                onClick={handleDelete}
                className="btn"
                style={{ backgroundColor: '#ff5555', color: 'white', fontWeight: 'bold' }}
            >
                出品を取り消す
            </button>

            {/* 更新ボタン */}
            <button type="submit" className="submit-btn" style={{margin: 0}}>
                変更を保存する
            </button>
        </div>

      </form>
    </div>
  );
};

export default ListingHensyu;