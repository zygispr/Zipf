import { motion } from 'motion/react';
import { memo, useState } from 'react';
import { Pagination } from '../../molecules/Pagination';
import { formatCount, formatPercent } from '../../../lib/selectView';
import type { WordEntry } from '../../../lib/types';
import styles from './WordTable.module.css';

/** Rows per page (research R12): keeps the DOM small for 50k-word vocabularies. */
const PAGE_SIZE = 50;

export interface WordTableProps {
  entries: WordEntry[];
}

export const WordTable = memo(function WordTable({ entries }: WordTableProps) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const rows = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroller}>
        <table className={styles.table}>
          <caption className={styles.caption}>All words by frequency</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.number}>
                Rank
              </th>
              <th scope="col">Word</th>
              <th scope="col" className={styles.number}>
                Count
              </th>
              <th scope="col" className={styles.number}>
                %
              </th>
            </tr>
          </thead>
          <motion.tbody
            key={page}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {rows.map((entry) => (
              <tr key={entry.word}>
                <td className={styles.number}>{entry.rank}</td>
                <th scope="row" className={styles.word}>
                  {entry.word}
                </th>
                <td className={styles.number}>{formatCount(entry.count)}</td>
                <td className={styles.number}>{formatPercent(entry.percent)}</td>
              </tr>
            ))}
          </motion.tbody>
        </table>
      </div>
      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />}
    </div>
  );
});
