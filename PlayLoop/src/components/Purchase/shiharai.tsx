import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../css/Shiharai.module.css';

const methods = ['クレジットカード', 'paypay', '楽天PAY'];
export default function Shiharai() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('paymentData') || 'null');
      if (methods.includes(saved?.method)) {
        setPaymentMethod(saved.method);
        sessionStorage.setItem('paymentData', JSON.stringify({ method: saved.method }));
      } else sessionStorage.removeItem('paymentData');
    } catch { sessionStorage.removeItem('paymentData'); }
  }, []);
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!methods.includes(paymentMethod)) { setError('支払方法を選択してください'); return; }
    sessionStorage.setItem('paymentData', JSON.stringify({ method: paymentMethod }));
    navigate(-1);
  }
  return <div className={styles.pageWrapper}>
    <div className={styles.formContainer}>
      <h1>支払方法の選択</h1>
      <p>デモ用の選択画面です。決済は行われません。</p>
      <form className={styles.formBox} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="payment-method">支払方法</label>
          <select id="payment-method" value={paymentMethod} className={styles.inputField}
            onChange={(event) => { setPaymentMethod(event.target.value); setError(''); }}>
            <option value="">選択してください</option>
            {methods.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>
        <button type="submit" className={styles.submitBtn}>支払方法を確定する</button>
      </form>
    </div>
  </div>;
}
