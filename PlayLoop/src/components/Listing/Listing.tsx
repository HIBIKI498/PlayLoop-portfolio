import SafeImage from '../SafeImage';
// src/components/Account/Listing.tsx

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../../firebase";
import "../../css/Listing.css";

const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Stateの定義 ---
  const [images, setImages] = useState<File[]>([]);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [platform, setPlatform] = useState(""); // ★ age から platform に変更
  const [shipping, setShipping] = useState("");
  const [region, setRegion] = useState("");
  const [days, setDays] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ★データ復元
  useEffect(() => {
    if (location.state) {
      const { images: savedImages, ...savedData } = location.state;
      if (savedImages) setImages(savedImages);
      if (savedData.productName) setProductName(savedData.productName);
      if (savedData.category) setCategory(savedData.category);
      if (savedData.condition) setCondition(savedData.condition);
      if (savedData.platform) setPlatform(savedData.platform); // ★ age から platform に変更
      if (savedData.shipping) setShipping(savedData.shipping);
      if (savedData.region) setRegion(savedData.region);
      if (savedData.days) setDays(savedData.days);
      if (savedData.description) setDescription(savedData.description);
      if (savedData.price) setPrice(savedData.price);
    }
  }, [location.state]);

  // --- Validate関数 ---
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (images.length === 0) newErrors.images = "画像を1枚以上追加してください";

    if (!productName.trim()) {
      newErrors.productName = "商品名は必須です";
    } else if (productName.length > 100) {
      newErrors.productName = "商品名は100文字以内で入力してください";
    }

    if (!category) newErrors.category = "カテゴリーを選択してください";
    if (!condition) newErrors.condition = "商品の状態を選択してください";
    if (!platform) newErrors.platform = "プラットフォームを選択してください"; // ★変更
    if (!shipping) newErrors.shipping = "配送方法を選択してください";
    if (!region) newErrors.region = "発送元の地方を選択してください";
    if (!days) newErrors.days = "発送日数を選択してください";

    // 価格チェック
    if (!price.trim()) {
      newErrors.price = "価格を入力してください";
    } else {
      const priceVal = parseInt(price, 10);
      if (isNaN(priceVal)) {
          newErrors.price = "半角数字で入力してください";
      } else if (priceVal < 100 || priceVal > 500000) {
          newErrors.price = "価格は¥100〜¥500,000の範囲で設定してください";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- 確認画面へ遷移 ---
  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const user = auth.currentUser;
    if (!user) {
        alert("ログインしてください");
        navigate("/create-account");
        return;
    }

    // 入力データをオブジェクトにまとめる
    const formData = {
      images,
      productName,
      category,
      condition,
      platform, // ★変更
      shipping,
      region,
      days,
      description,
      price
    };

    navigate("/listing/kakunin", { state: formData });
  };

  // --- 画像操作系 ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    if (images.length + selected.length > 6) {
      alert("画像は最大6枚までです");
      return;
    }
    setImages([...images, ...selected]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (images.length + droppedFiles.length > 6) {
      alert("画像は最大6枚です");
      return;
    }
    setImages([...images, ...droppedFiles]);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    const onlyNums = val.replace(/[^0-9]/g, '');
    setPrice(onlyNums);
  };

  return (
    <div className="container">
      <h1>商品の出品</h1>

      <form onSubmit={handleConfirm}>
        {/* 画像セクション */}
        <div className="form-group">
          <label>出品画像（最大6枚）</label>
          <div
            className="upload-box"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImageSelect}
            />
            {images.length < 6 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                画像を選択
              </button>
            )}

            <div id="preview">
              {images.map((img, index) => (
                <div key={index} className="image-wrapper">
                  <SafeImage
                    src={URL.createObjectURL(img)}
                    alt="preview"
                    className="preview-image"
                  />
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() =>
                      setImages(images.filter((_, i) => i !== index))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {errors.images && (
              <div style={{ color: "red" }}>{errors.images}</div>
            )}
          </div>
        </div>

        {/* 商品名 */}
        <div className="form-group">
          <label htmlFor="product-name">商品名</label>
          <input
            type="text"
            id="product-name"
            value={productName}
            placeholder="商品名を入力してください"
            onChange={(e) => setProductName(e.target.value)}
          />
          {errors.productName && (
            <div style={{ color: "red", marginTop: 6 }}>{errors.productName}</div>
          )}
        </div>

        {/* カテゴリー */}
        <div className="form-group">
          <label htmlFor="category">カテゴリー</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">選択してください</option>
            <option>ゲーム機本体</option>
            <option>ゲーム・カセット</option>
            <option>周辺機器</option>
            <option>攻略本</option>
            <option>グッズ</option>
          </select>
          {errors.category && (
            <div style={{ color: "red", marginTop: 6 }}>{errors.category}</div>
          )}
        </div>

        {/* 商品の状態 */}
        <div className="form-group">
          <label htmlFor="condition">商品の状態</label>
          <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">選択してください</option>
            <option>新品・未使用</option>
            <option>目立った傷や汚れなし</option>
            <option>やや傷や汚れあり</option>
            <option>傷や汚れあり</option>
            <option>状態が悪い</option>
          </select>
          {errors.condition && (
            <div style={{ color: "red", marginTop: 6 }}>{errors.condition}</div>
          )}
        </div>

        {/* プラットフォーム */}
        <div className="form-group">
          <label htmlFor="platform">プラットフォーム</label>
          <select id="platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">選択してください</option>
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
          {errors.platform && (
            <div style={{ color: "red", marginTop: 6 }}>{errors.platform}</div>
          )}
        </div>

        {/* 配送方法 */}
        <div className="form-group">
          <label htmlFor="shipping">配送方法</label>
          <select id="shipping" value={shipping} onChange={(e) => setShipping(e.target.value)}>
            <option value="">選択してください</option>
            <option>ゆうパック</option>
            <option>宅急便</option>
            <option>定形外郵便</option>
            <option>クリックポスト</option>
          </select>
          {errors.shipping && (
            <div style={{ color: "red", marginTop: 6 }}>{errors.shipping}</div>
          )}
        </div>

        {/* 発送元の地方 */}
        <div className="form-group">
          <label htmlFor="region">発送元の地方</label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value)}>
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
          {errors.region && (
            <div style={{ color: "red", marginTop: 6 }}>{errors.region}</div>
          )}
        </div>

        {/* 発送日数 */}
        <div className="form-group">
          <label htmlFor="days">発送までの日数</label>
          <select id="days" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="">選択してください</option>
            <option value="1-2日">1〜2日で発送</option>
            <option value="3-5日">3〜5日で発送</option>
            <option value="5-7日">5〜7日で発送</option>
          </select>
          {errors.days && (
            <div style={{ color: "red", marginTop: 6 }}>{errors.days}</div>
          )}
        </div>

        {/* 説明 */}
        <div className="form-group">
          <label htmlFor="description">商品の説明</label>
          <textarea
            id="description"
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="商品の説明を入力してください"
          />
        </div>

        {/* 価格 */}
        <div className="form-group">
          <label htmlFor="product-price">価格の設定</label>
          <input
            type="text"
            id="product-price"
            value={price}
            placeholder="￥0"
            onChange={handlePriceChange}
          />
          {errors.price && (
            <div style={{ color: "red", marginTop: 6 }}>{errors.price}</div>
          )}
        </div>

        <button className="submit-btn" type="submit">
          出品内容を確認する
        </button>
      </form>
    </div>
  );
};

export default ProductForm;