import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../../css/PurchaseComplete.module.css';

const PurchaseComplete: React.FC = () => {
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.completeContainer}>
        <i className={`fa-solid fa-circle-check ${styles.completionIcon}`}></i>
        
        <h1 className={styles.title}>購入手続きが完了しました！</h1>
        
        <p className={styles.message}>
          ご注文ありがとうございます。<br />
          購入手続きが正常に完了しました。詳細はマイページのご購入履歴よりご確認ください。
        </p>
        
        <div className={styles.actionButtons}>
          <Link to="/mypage" className={`${styles.btn} ${styles.btnPrimary}`}>
            ご購入履歴へ
          </Link>
          <Link to="/" className={`${styles.btn} ${styles.btnSecondary}`}>
            トップページへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PurchaseComplete;