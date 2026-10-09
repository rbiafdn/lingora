import { useEffect, useMemo, useRef, useState } from 'react'
import { progressStore, useProgress, type UndoPoint } from '../core/progress'
import { prefs } from '../core/prefs'
import {
  backupStats,
  createBackup,
  downloadBackup,
  parseBackup,
  type BackupFile,
  type BackupStats,
} from '../core/backup'
import { Modal } from '../components/Modal'
import type { LangContext } from './LanguageShell'

type Notice = { tone: 'ok' | 'error'; text: string } | null

const fmt = (n: number) => n.toLocaleString('tr-TR')
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return isNaN(+d) ? '' : d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function SettingsPage({ ctx }: { ctx: LangContext }) {
  const { languageId, allItems } = ctx
  const progress = useProgress(languageId)
  const [notice, setNotice] = useState<Notice>(null)
  const [pending, setPending] = useState<{ backup: BackupFile; stats: BackupStats; warnings: string[] } | null>(null)
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const [undo, setUndo] = useState<UndoPoint | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)

  const knownIds = useMemo(() => new Set(allItems.map((it) => it.id)), [allItems])
  const learnedHere = allItems.reduce((n, it) => n + (progress.learned.has(it.id) ? 1 : 0), 0)
  const favHere = allItems.reduce((n, it) => n + (progress.favorites.has(it.id) ? 1 : 0), 0)

  const refreshUndo = () => progressStore.undoPoint().then(setUndo, () => setUndo(undefined))
  useEffect(() => {
    refreshUndo()
  }, [])

  async function onExport() {
    await progressStore.flush()
    const backup = createBackup(progressStore.snapshot(), prefs.get())
    downloadBackup(backup)
    const s = backupStats(backup.progress, () => undefined)
    setNotice({ tone: 'ok', text: `Yedek indirildi: ${fmt(s.learned)} bilinen, ${fmt(s.favorites)} favori.` })
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setNotice(null)
    let text: string
    try {
      text = await file.text()
    } catch {
      setNotice({ tone: 'error', text: 'Dosya okunamadı.' })
      return
    }
    const res = parseBackup(text)
    if (!res.ok) {
      setNotice({ tone: 'error', text: res.error })
      return
    }
    // Ids are only checked against the language whose content is loaded right now.
    const stats = backupStats(res.backup.progress, (lang) => (lang === languageId ? knownIds : undefined))
    setPending({ backup: res.backup, stats, warnings: res.warnings })
  }

  async function applyImport(mode: 'replace' | 'merge') {
    if (!pending) return
    try {
      await progressStore.restore(pending.backup.progress, mode, 'import')
      if (mode === 'replace') prefs.replace(pending.backup.preferences)
      setNotice({
        tone: 'ok',
        text: mode === 'replace' ? 'Yedek geri yüklendi.' : 'Yedek mevcut ilerlemeyle birleştirildi.',
      })
    } catch (e) {
      setNotice({ tone: 'error', text: `Geri yükleme başarısız; mevcut veriler değiştirilmedi. (${String(e)})` })
    }
    setPending(null)
    refreshUndo()
  }

  async function applyReset() {
    try {
      await progressStore.reset()
      setNotice({ tone: 'ok', text: 'İlerleme sıfırlandı. İstersen “Son işlemi geri al” ile geri getirebilirsin.' })
    } catch (e) {
      setNotice({ tone: 'error', text: `Sıfırlanamadı. (${String(e)})` })
    }
    setResetStep(0)
    refreshUndo()
  }

  async function applyUndo() {
    try {
      await progressStore.undo()
      setNotice({ tone: 'ok', text: 'Son işlem geri alındı; önceki ilerleme geri geldi.' })
    } catch (e) {
      setNotice({ tone: 'error', text: `Geri alınamadı. (${String(e)})` })
    }
    refreshUndo()
  }

  return (
    <div className="settings">
      <header className="page-head">
        <h1>Ayarlar</h1>
      </header>

      {notice && (
        <div className={`notice notice-${notice.tone}`} role="status">
          {notice.text}
        </div>
      )}

      <section className="settings-card">
        <h2>Verilerin</h2>
        <p className="muted">
          Hesap yok: ilerlemen yalnızca bu cihazda, bu tarayıcıda saklanır ({progressStore.backendName()}). Başka
          cihazla eşitlenmez. Tarayıcı verilerini temizlersen kaybolabilir; düzenli yedek almanı öneririz.
        </p>
        <div className="stat-row">
          <div>
            <span className="stat-num">{fmt(learnedHere)}</span>
            <span className="muted small">bilinen</span>
          </div>
          <div>
            <span className="stat-num">{fmt(favHere)}</span>
            <span className="muted small">favori</span>
          </div>
          <div>
            <span className="stat-num">{fmt(allItems.length)}</span>
            <span className="muted small">içerik</span>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <h2>Verilerimi Yedekle</h2>
        <p className="muted">
          Bildiklerin, favorilerin ve tercihlerin tek bir JSON dosyası olarak indirilir. Dosyayı güvenli bir yerde sakla.
        </p>
        <button type="button" className="btn btn-primary" onClick={onExport}>
          Yedeği indir
        </button>
      </section>

      <section className="settings-card">
        <h2>Yedeği Geri Yükle</h2>
        <p className="muted">Daha önce Lingora’dan indirdiğin yedek dosyasını seç. Değişiklikten önce onay istenir.</p>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Yedek dosyası seç…
        </button>
      </section>

      {undo && (
        <section className="settings-card">
          <h2>Son işlemi geri al</h2>
          <p className="muted">
            {undo.reason === 'reset' ? 'Sıfırlama' : 'Yedekten geri yükleme'} öncesindeki ilerleme saklandı (
            {fmtDate(undo.createdAt)}).
          </p>
          <button type="button" className="btn" onClick={applyUndo}>
            Önceki duruma dön
          </button>
        </section>
      )}

      <section className="settings-card settings-danger">
        <h2>İlerlemeyi Sıfırla</h2>
        <p className="muted">Tüm diller için öğrenme işaretlerini ve favorileri siler. İçeriklere dokunmaz.</p>
        <button type="button" className="btn btn-danger" onClick={() => setResetStep(1)}>
          İlerlemeyi sıfırla…
        </button>
      </section>

      {pending && (
        <ImportConfirm
          pending={pending}
          languageId={languageId}
          onCancel={() => setPending(null)}
          onConfirm={applyImport}
        />
      )}
      {resetStep > 0 && (
        <ResetConfirm step={resetStep as 1 | 2} onNext={() => setResetStep(2)} onCancel={() => setResetStep(0)} onConfirm={applyReset} />
      )}
    </div>
  )
}

function ImportConfirm({
  pending,
  languageId,
  onCancel,
  onConfirm,
}: {
  pending: { backup: BackupFile; stats: BackupStats; warnings: string[] }
  languageId: string
  onCancel: () => void
  onConfirm: (mode: 'replace' | 'merge') => void
}) {
  const [mode, setMode] = useState<'replace' | 'merge'>('replace')
  const [busy, setBusy] = useState(false)
  const { stats, backup, warnings } = pending
  const empty = stats.learned === 0 && stats.favorites === 0
  return (
    <Modal onClose={onCancel} labelledBy="import-title">
      <div className="confirm">
        <h2 id="import-title">Yedeği geri yükle</h2>
        <p>
          Yedek tarihi: <b>{fmtDate(backup.exportedAt) || 'bilinmiyor'}</b>
          <br />
          İçinde <b>{fmt(stats.learned)}</b> bilinen ve <b>{fmt(stats.favorites)}</b> favori kayıt var
          {stats.languages.length > 0 && <> ({stats.languages.map((l) => l.toUpperCase()).join(', ')})</>}.
        </p>
        {warnings.map((w) => (
          <p key={w} className="warn">
            {w}
          </p>
        ))}
        {stats.unknownIds > 0 && (
          <p className="warn">
            {fmt(stats.unknownIds)} kayıt şu anki {languageId.toUpperCase()} içeriğinde bulunmuyor (eski ya da kaldırılmış
            içerik). Bu kayıtlar saklanır ama listede görünmez.
          </p>
        )}
        {empty && <p className="warn">Bu yedekte hiç işaret yok. “Değiştir” seçilirse mevcut ilerlemen boşalır.</p>}

        <fieldset className="mode">
          <label>
            <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            <span>
              <b>Değiştir</b> — mevcut işaretler yerine yedektekiler gelir (tercihler de yüklenir)
            </span>
          </label>
          <label>
            <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            <span>
              <b>Birleştir</b> — mevcut işaretler korunur, yedektekiler eklenir
            </span>
          </label>
        </fieldset>

        <p className="confirm-q">
          Bu işlem mevcut öğrenme durumlarınızı ve favorilerinizi değiştirecek. Devam etmek istiyor musunuz?
        </p>
        <p className="muted small">Gerekirse Ayarlar’daki “Son işlemi geri al” ile önceki duruma dönebilirsin.</p>
        <div className="confirm-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Vazgeç
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              onConfirm(mode)
            }}
          >
            Evet, geri yükle
          </button>
        </div>
      </div>
    </Modal>
  )
}

const RESET_WORD = 'SIFIRLA'

function ResetConfirm({
  step,
  onNext,
  onCancel,
  onConfirm,
}: {
  step: 1 | 2
  onNext: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal onClose={onCancel} labelledBy="reset-title">
      <div className="confirm">
        <h2 id="reset-title">İlerlemeyi sıfırla</h2>
        {step === 1 ? (
          <>
            <p>Tüm öğrenme işaretleri ve favoriler silinecek. İçerikler silinmez.</p>
            <p className="muted small">Önce yedek almak istersen vazgeçip “Yedeği indir”i kullan.</p>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={onCancel}>
                Vazgeç
              </button>
              <button type="button" className="btn btn-danger" onClick={onNext}>
                Devam et
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              Emin misin? Onaylamak için aşağıya <b>{RESET_WORD}</b> yaz.
            </p>
            <input
              className="confirm-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={RESET_WORD}
              aria-label={`Onay için ${RESET_WORD} yaz`}
              autoFocus
            />
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={onCancel}>
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busy || typed.trim().toLocaleUpperCase('tr') !== RESET_WORD}
                onClick={() => {
                  setBusy(true)
                  onConfirm()
                }}
              >
                Kalıcı olarak sıfırla
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
