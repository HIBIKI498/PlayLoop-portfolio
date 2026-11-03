import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../css/Juusyo.module.css';

// エラー情報の型定義
interface Errors {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address?: string;
  recipient?: string;
}

// ★追加: 47都道府県のリスト
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

const Juusyo: React.FC = () => {
  const navigate = useNavigate();

  const [addressInfo, setAddressInfo] = useState({
    postalCode: "",
    prefecture: "選択してください",
    city: "",
    address: "",
    recipient: ""
  });

  // エラーメッセージ管理用
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    const savedData = sessionStorage.getItem('addressData');
    if (savedData) {
      setAddressInfo(JSON.parse(savedData));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    const keyMap: {[key: string]: string} = {
      "postal-code": "postalCode",
      "prefecture": "prefecture",
      "city": "city",
      "address": "address",
      "recipient": "recipient"
    };
    const stateKey = keyMap[id];
    if (stateKey) {
      setAddressInfo(prev => ({ ...prev, [stateKey]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーションチェック
    const newErrors: Errors = {};
    let hasError = false;

    // ★修正: 郵便番号の形式チェックを追加（ハイフンあり・なし両方対応）
    const postalCodeRegex = /^\d{3}-?\d{4}$/;
    if (!addressInfo.postalCode.trim()) {
      newErrors.postalCode = "郵便番号を入力してください";
      hasError = true;
    } else if (!postalCodeRegex.test(addressInfo.postalCode.trim())) {
      newErrors.postalCode = "正しい形式で入力してください (例: 123-4567)";
      hasError = true;
    }

    if (addressInfo.prefecture === "選択してください" || !addressInfo.prefecture) {
      newErrors.prefecture = "都道府県を選択してください";
      hasError = true;
    }
    if (!addressInfo.city.trim()) {
      newErrors.city = "市区町村を入力してください";
      hasError = true;
    }
    if (!addressInfo.address.trim()) {
      newErrors.address = "番地・建物名を入力してください";
      hasError = true;
    }
    if (!addressInfo.recipient.trim()) {
      newErrors.recipient = "受取人氏名を入力してください";
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) return; // エラーがあれば中断

    sessionStorage.setItem('addressData', JSON.stringify(addressInfo));
    navigate(-1);
  };

  return (
    <div className={styles.pageWrapper}>
      {/* ★削除: 戻るボタンを削除しました */}
      
      <div className={styles.container}>
        <h1>配送先住所の登録</h1>
        <p>デモ用の架空の住所を入力してください。</p>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="postal-code">郵便番号</label>
            <input 
              type="text" 
              id="postal-code" 
              maxLength={8} 
              placeholder="例: 123-4567"
              value={addressInfo.postalCode}
              onChange={handleChange}
              className={styles.inputField}
              style={errors.postalCode ? { borderColor: 'red' } : {}}
            />
            {errors.postalCode && <p className={styles.errorMsg}>{errors.postalCode}</p>}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="prefecture">都道府県</label>
            <select 
              id="prefecture"
              value={addressInfo.prefecture}
              onChange={handleChange}
              className={styles.inputField}
              style={errors.prefecture ? { borderColor: 'red' } : {}}
            >
              <option>選択してください</option>
              {/* ★修正: 47都道府県を自動で表示するように変更 */}
              {PREFECTURES.map(pref => (
                <option key={pref} value={pref}>{pref}</option>
              ))}
            </select>
            {errors.prefecture && <p className={styles.errorMsg}>{errors.prefecture}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="city">市区町村</label>
            <input 
              type="text" 
              id="city" 
              maxLength={40} 
              placeholder="例: サンプル市サンプル区"
              value={addressInfo.city}
              onChange={handleChange}
              className={styles.inputField}
              style={errors.city ? { borderColor: 'red' } : {}}
            />
            {errors.city && <p className={styles.errorMsg}>{errors.city}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="address">番地・建物名</label>
            <input 
              type="text" 
              id="address" 
              maxLength={100} 
              placeholder="例: サンプル町1-2-3 デモビル"
              value={addressInfo.address}
              onChange={handleChange}
              className={styles.inputField}
              style={errors.address ? { borderColor: 'red' } : {}}
            />
            {errors.address && <p className={styles.errorMsg}>{errors.address}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="recipient">受取人氏名</label>
            <input 
              type="text" 
              id="recipient" 
              maxLength={40} 
              placeholder="例: サンプル 太郎"
              value={addressInfo.recipient}
              onChange={handleChange}
              className={styles.inputField}
              style={errors.recipient ? { borderColor: 'red' } : {}}
            />
            {errors.recipient && <p className={styles.errorMsg}>{errors.recipient}</p>}
          </div>

          <button type="submit" className={styles.submitBtn}>登録する</button>    
        </form>
      </div>
    </div>
  );
};

export default Juusyo;