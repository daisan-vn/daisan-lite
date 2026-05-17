// ========================================================================
//  i18n.js — Central translation dictionary (v0.11)
// ========================================================================
//  Cach dung trong component:
//
//    import { useT } from '../hooks/useLanguage'
//    const t = useT()
//    return <h1>{t('header.title')}</h1>
//
//  Neu thieu key trong language hien tai, fallback sang Vietnamese.
//  Neu thieu trong ca 2 → tra ve key (de dev biet la quen dich).
// ========================================================================

export const TRANSLATIONS = {
  vi: {
    // ─── Common ──────────────────────────────────────────────────────────
    common: {
      loading:        'Dang tai...',
      save:           'Luu',
      saving:         'Dang luu...',
      cancel:         'Huy',
      delete:         'Xoa',
      edit:           'Sua',
      close:          'Dong',
      confirm:        'Xac nhan',
      back:           'Quay lai',
      next:           'Tiep tuc',
      done:           'Xong',
      copy:           'Copy',
      copied:         'Da copy',
      yes:            'Co',
      no:             'Khong',
      success:        'Thanh cong',
      error:          'Loi',
      warning:        'Canh bao',
      info:           'Thong tin',
      free:           'Mien phi',
      pro:            'PRO',
      business:       'BUSINESS',
    },

    // ─── Header & layout ─────────────────────────────────────────────────
    header: {
      tagline:        'Tao web bang tieng Viet',
      clientMode:     'Edit mode — chi sua text',
      newProject:     '+ Project moi',
      inviteClient:   '👥 Khach hang',
    },

    // ─── Auth screen ─────────────────────────────────────────────────────
    auth: {
      title:           'Chao mung tro lai',
      subtitle:        'Dang nhap de tiep tuc voi cac project cua ban',
      continueWithGoogle: 'Tiep tuc voi Google',
      orDivider:       'HOAC',
      emailLabel:      'EMAIL CUA BAN',
      emailPlaceholder:'email@example.com',
      sendMagicLink:   'Gui link dang nhap',
      sendingMagicLink:'Dang gui...',
      magicLinkSent:   'Da gui link dang nhap',
      checkEmail:      'Kiem tra email',
      checkEmailDesc:  'Click vao link trong email de dang nhap',
      back:            'Quay lai',
      bottomNote:      'Chung toi se gui link bao mat den email cua ban — khong can mat khau',
      terms:           'Bang viec dang nhap, ban dong y voi Dieu khoan & Chinh sach bao mat',
      tagline:         'Tao web bang tieng Viet — sieu nhanh',
    },

    // ─── User menu ───────────────────────────────────────────────────────
    userMenu: {
      upgrade:         'Nang cap goi',
      signOut:         'Dang xuat',
      signOutConfirm:  'Dang xuat khoi DaisanAI?',
    },

    // ─── PromptInput ─────────────────────────────────────────────────────
    prompt: {
      labelNew:        'MO TA WEBSITE BAN MUON',
      labelIterate:    'SUA TIEP PROJECT NAY',
      placeholderNew:  'VD: Website quan pho voi trang chu, menu, gioi thieu va lien he...',
      placeholderIterate: 'VD: Doi thanh tone xanh, them trang lien he, doi gia...',
      hint:            'Ctrl+Enter',
      submitNew:       '+ Tao website',
      submitIterate:   '→ Cap nhat',
      submitting:      'Dang xu ly...',
      currentProject:  'Project hien tai:',
      cancelIterate:   'Project moi',
      suggestionsTitle:'GOI Y NHANH',
    },

    // ─── ProjectList ─────────────────────────────────────────────────────
    projects: {
      title:           'PROJECT',
      empty:           'Chua co project nao',
      emptyHint:       'Nhap mo ta o tren de bat dau',
      timeJustNow:     'vua xong',
      timeSecondAgo:   'giay truoc',
      timeMinuteAgo:   'phut truoc',
      timeHourAgo:     'gio truoc',
      timeDayAgo:      'ngay truoc',
      delete:          'Xoa',
      rename:          'Doi ten',
      deleteConfirm:   'Xoa project nay? Khong the hoan tac.',
      deleteSuccess:   'Da xoa project',
      renameSuccess:   'Da doi ten',
      renamePlaceholder: 'Ten moi',
    },

    // ─── TemplatesGrid ───────────────────────────────────────────────────
    templates: {
      title:           'Bat dau voi template',
      subtitle:        'Chon template nganh cua ban — clone xong la co web ngay, sau do iterate de cu the hon',
      filterAll:       'Tat ca',
      filterFnB:       'F&B',
      filterFashion:   'Thoi trang',
      filterService:   'Dich vu',
      filterEducation: 'Giao duc',
      cloneButton:     'Su dung',
      cloning:         'Dang clone...',
      cloneSuccess:    '✓ Da tao project tu template',
      cloneError:      'Loi clone template',
      pagesCount:      'trang',
      usesCount:       'clone',
      featured:        'Featured',
      empty:           'Chua co template nao',
      emptyHint:       'Lien he chu DaisanAI de them template',
    },

    // ─── Preview toolbar & area ──────────────────────────────────────────
    preview: {
      modePreview:     'Preview',
      modeCode:        'Code',
      viewportDesktop: 'Desktop',
      viewportTablet:  'Tablet',
      viewportMobile:  'Mobile',
      editText:        'Sua text',
      editMode:        'Edit mode',
      editModeDirty:   'Edit mode (co thay doi)',
      save:            '✓ Luu',
      saveLoading:     'Dang luu...',
      cancel:          'Huy',
      saveSuccess:     '✓ Da luu thay doi',
      openInNewTab:    'Mo',
      openTitle:       'Mo trong tab moi',
      download:        'Tai',
      downloadTitle:   'Tai file HTML',
      publish:         'Publish',
      publishing:      'Publishing...',
      published:       'Live',
      publishSuccess:  '🚀 Da publish!',
      unpublish:       '⊘  Unpublish (an website)',
      unpublishConfirm:'Unpublish website? URL hien tai se khong con truy cap duoc.',
      unpublishSuccess:'Da unpublish',
      copyLink:        'Copy link',
      openLive:        'Mo website live',
      addDomain:       '🌍  Gan custom domain (Pro+)',
      streamingNew:    'AI dang tao website...',
      streamingIterate:'AI dang cap nhat...',
      emptyClient:     'Chua co project nao',
      emptyClientHint: 'Hay yeu cau chu DaisanAI gui link moi de bat dau edit web cua ban.',
    },

    // ─── Billing ─────────────────────────────────────────────────────────
    billing: {
      title:           'Goi & Thanh toan',
      back:            '← Quay lai',
      currentPlan:     'Goi hien tai',
      usage:           'Su dung thang nay',
      generations:     'lan tao web',
      projects:        'project',
      unlimited:       'Khong gioi han',
      plan: {
        free:          'Free',
        pro:           'Pro',
        business:      'Business',
        freeDesc:      'Test thu DaisanAI',
        proDesc:       'Cho ca nhan & freelance',
        businessDesc:  'Cho doanh nghiep',
      },
      upgradeButton:   'Nang cap',
      currentButton:   'Dang dung',
      perMonth:        '/thang',
      features:        'Tinh nang',
      mockMode:        '🧪 MOCK MODE — VNPay chua config. Click Nang cap se instant success (test UX).',
      paymentSuccess:  '🎉 Da nang cap thanh cong!',
      paymentFailed:   'Thanh toan that bai',
      processingPayment: 'Dang xu ly thanh toan...',
    },

    // ─── Domain settings ─────────────────────────────────────────────────
    domain: {
      title:           'Custom Domain',
      subtitle:        'Gan ten mien rieng cho website cua ban',
      currentDomain:   'Domain hien tai',
      addDomain:       'Them domain',
      domainPlaceholder: 'vd: cafelinh.com',
      next:            'Tiep tuc',
      step1Title:      'Buoc 1: DNS cua ban',
      step1Desc:       'Vao trang quan ly DNS cua nha cung cap domain, them ban ghi sau:',
      step2Title:      'Buoc 2: Verify',
      step2Desc:       'Sau khi them ban ghi, click Verify de chung minh ban so huu domain',
      verifyButton:    'Verify domain',
      verifying:       'Dang verify...',
      verified:        '✓ Da verify',
      verifyFailed:    'Verify that bai — DNS chua active. Doi 5-10 phut va thu lai.',
      removeButton:    'Xoa domain',
      removeConfirm:   'Xoa domain khoi project nay?',
      removeSuccess:   'Da xoa domain',
      proRequired:     'Tinh nang nay chi co o goi Pro+',
    },

    // ─── Invite Client Modal ─────────────────────────────────────────────
    invite: {
      title:           '👥 Moi khach hang edit',
      subtitle:        'Khach hang co the dang nhap va sua text, gia, thong tin lien he',
      emailLabel:      'Email khach hang',
      emailPlaceholder:'vd: chuquan@cafeannien.vn',
      emailHint:       'Khach se nhan link → dang nhap bang chinh email nay → tu sua web cua ho',
      createButton:    '📩 Tao link moi',
      createButtonReinvite: 'Tao link MOI (huy link cu)',
      creating:        'Dang tao link...',
      createSuccess:   '✓ Da tao link moi. Copy va gui cho khach hang.',
      linkLabel:       'Link moi (gui cho khach)',
      copyButton:      '📋 Copy',
      zaloButton:      '💬 Gui qua Zalo',
      emailButton:     '✉️ Gui qua Email',
      acceptedTitle:   'Khach da accept',
      acceptedSince:   'Tu:',
      pendingTitle:    '⏳ Da gui invite — cho khach accept',
      pendingExpires:  'Het han:',
      revokeButton:    'Huy quyen',
      revokeConfirm:   'Huy quyen edit cua khach hang? Ho se khong vao duoc nua.',
      revokeSuccess:   'Da huy quyen edit cua khach',
      noteTitle:       'Luu y:',
      noteExpire:      'Link het han sau 30 ngay',
      noteEmail:       'Khach dang nhap dung email',
      notePermission:  'Khach chi sua duoc text — khong xoa, khong AI, khong billing',
    },

    // ─── Client Invite Accept ────────────────────────────────────────────
    clientAccept: {
      title:           'Ban duoc moi sua website',
      project:         'Project:',
      emailLabel:      'Email da duoc moi',
      emailHint:       '⚠️ Ban phai dang nhap dung email nay. Khong the dung email khac.',
      sendLink:        'Gui link dang nhap →',
      magicLinkSent:   'Da gui link dang nhap',
      magicLinkDesc:   'Kiem tra email, click link de tiep tuc.',
      checkSpam:       'Khong thay email? Check Spam/Quang cao folder.',
      acceptingTitle:  'Sap xong!',
      acceptingDesc:   'Ban dang nhap voi',
      enterProject:    'Vao project →',
      invalidTitle:    'Link khong hop le',
      backHome:        '← Ve trang chu',
      verifying:       'Dang xac nhan...',
      poweredBy:       'Powered by DaisanAI Lite',
      clientModeTag:   'Client edit mode',
    },

    // ─── Client mode sidebar ─────────────────────────────────────────────
    clientSidebar: {
      youAreEditing:   'Ban dang sua',
      guideTitle:      '💡 Huong dan',
      guideStep1:      'Click',
      guideStep1End:   'tren toolbar',
      guideStep2:      'Hover chu, click vao de sua',
      guideStep3:      'Click',
      guideStep3End:   'de save',
      permsTitle:      'Quyen cua ban',
      perm1:           '✓ Sua text (ten, gia, mo ta)',
      perm2:           '✓ Xem tat ca cac trang',
      perm3:           '✗ Khong the xoa hoac tao moi',
      perm4:           '✗ Khong dung duoc AI',
      contactOwner:    'Lien he chu DaisanAI neu can sua phuc tap',
    },
  },

  en: {
    // ─── Common ──────────────────────────────────────────────────────────
    common: {
      loading:        'Loading...',
      save:           'Save',
      saving:         'Saving...',
      cancel:         'Cancel',
      delete:         'Delete',
      edit:           'Edit',
      close:          'Close',
      confirm:        'Confirm',
      back:           'Back',
      next:           'Next',
      done:           'Done',
      copy:           'Copy',
      copied:         'Copied',
      yes:            'Yes',
      no:             'No',
      success:        'Success',
      error:          'Error',
      warning:        'Warning',
      info:           'Info',
      free:           'Free',
      pro:            'PRO',
      business:       'BUSINESS',
    },

    header: {
      tagline:        'Build websites with AI',
      clientMode:     'Edit mode — text only',
      newProject:     '+ New project',
      inviteClient:   '👥 Client',
    },

    auth: {
      title:           'Welcome back',
      subtitle:        'Sign in to continue with your projects',
      continueWithGoogle: 'Continue with Google',
      orDivider:       'OR',
      emailLabel:      'YOUR EMAIL',
      emailPlaceholder:'email@example.com',
      sendMagicLink:   'Send magic link',
      sendingMagicLink:'Sending...',
      magicLinkSent:   'Magic link sent',
      checkEmail:      'Check your email',
      checkEmailDesc:  'Click the link in your email to sign in',
      back:            'Back',
      bottomNote:      'We will send a secure link to your email — no password needed',
      terms:           'By signing in, you agree to our Terms & Privacy Policy',
      tagline:         'Build websites in Vietnamese — instantly',
    },

    userMenu: {
      upgrade:         'Upgrade plan',
      signOut:         'Sign out',
      signOutConfirm:  'Sign out of DaisanAI?',
    },

    prompt: {
      labelNew:        'DESCRIBE YOUR WEBSITE',
      labelIterate:    'UPDATE THIS PROJECT',
      placeholderNew:  'E.g.: Pho restaurant website with homepage, menu, about, and contact pages...',
      placeholderIterate: 'E.g.: Change to green theme, add contact page, update prices...',
      hint:            'Ctrl+Enter',
      submitNew:       '+ Create website',
      submitIterate:   '→ Update',
      submitting:      'Processing...',
      currentProject:  'Current project:',
      cancelIterate:   'New project',
      suggestionsTitle:'QUICK SUGGESTIONS',
    },

    projects: {
      title:           'PROJECTS',
      empty:           'No projects yet',
      emptyHint:       'Type a description above to get started',
      timeJustNow:     'just now',
      timeSecondAgo:   's ago',
      timeMinuteAgo:   'm ago',
      timeHourAgo:     'h ago',
      timeDayAgo:      'd ago',
      delete:          'Delete',
      rename:          'Rename',
      deleteConfirm:   'Delete this project? This cannot be undone.',
      deleteSuccess:   'Project deleted',
      renameSuccess:   'Renamed',
      renamePlaceholder: 'New name',
    },

    templates: {
      title:           'Start with a template',
      subtitle:        'Choose a template for your industry — clone instantly, then iterate to customize',
      filterAll:       'All',
      filterFnB:       'F&B',
      filterFashion:   'Fashion',
      filterService:   'Services',
      filterEducation: 'Education',
      cloneButton:     'Use',
      cloning:         'Cloning...',
      cloneSuccess:    '✓ Project created from template',
      cloneError:      'Failed to clone template',
      pagesCount:      'pages',
      usesCount:       'clones',
      featured:        'Featured',
      empty:           'No templates yet',
      emptyHint:       'Contact DaisanAI owner to add templates',
    },

    preview: {
      modePreview:     'Preview',
      modeCode:        'Code',
      viewportDesktop: 'Desktop',
      viewportTablet:  'Tablet',
      viewportMobile:  'Mobile',
      editText:        'Edit text',
      editMode:        'Edit mode',
      editModeDirty:   'Edit mode (unsaved)',
      save:            '✓ Save',
      saveLoading:     'Saving...',
      cancel:          'Cancel',
      saveSuccess:     '✓ Changes saved',
      openInNewTab:    'Open',
      openTitle:       'Open in new tab',
      download:        'Download',
      downloadTitle:   'Download HTML file',
      publish:         'Publish',
      publishing:      'Publishing...',
      published:       'Live',
      publishSuccess:  '🚀 Published!',
      unpublish:       '⊘  Unpublish (hide website)',
      unpublishConfirm:'Unpublish website? The current URL will no longer be accessible.',
      unpublishSuccess:'Unpublished',
      copyLink:        'Copy link',
      openLive:        'Open live website',
      addDomain:       '🌍  Add custom domain (Pro+)',
      streamingNew:    'AI is creating your website...',
      streamingIterate:'AI is updating...',
      emptyClient:     'No project assigned',
      emptyClientHint: 'Ask the DaisanAI owner to send you an invite link to start editing.',
    },

    billing: {
      title:           'Plans & Billing',
      back:            '← Back',
      currentPlan:     'Current plan',
      usage:           'This month usage',
      generations:     'generations',
      projects:        'projects',
      unlimited:       'Unlimited',
      plan: {
        free:          'Free',
        pro:           'Pro',
        business:      'Business',
        freeDesc:      'Try DaisanAI',
        proDesc:       'For individuals & freelancers',
        businessDesc:  'For businesses',
      },
      upgradeButton:   'Upgrade',
      currentButton:   'Current',
      perMonth:        '/month',
      features:        'Features',
      mockMode:        '🧪 MOCK MODE — VNPay not configured. Click Upgrade for instant success (test UX).',
      paymentSuccess:  '🎉 Upgraded successfully!',
      paymentFailed:   'Payment failed',
      processingPayment: 'Processing payment...',
    },

    domain: {
      title:           'Custom Domain',
      subtitle:        'Connect your own domain to this website',
      currentDomain:   'Current domain',
      addDomain:       'Add domain',
      domainPlaceholder: 'e.g.: cafelinh.com',
      next:            'Continue',
      step1Title:      'Step 1: Your DNS',
      step1Desc:       'Go to your domain provider DNS management page and add the following record:',
      step2Title:      'Step 2: Verify',
      step2Desc:       'After adding the DNS record, click Verify to prove ownership',
      verifyButton:    'Verify domain',
      verifying:       'Verifying...',
      verified:        '✓ Verified',
      verifyFailed:    'Verify failed — DNS not active yet. Wait 5-10 minutes and try again.',
      removeButton:    'Remove domain',
      removeConfirm:   'Remove domain from this project?',
      removeSuccess:   'Domain removed',
      proRequired:     'This feature requires Pro+ plan',
    },

    invite: {
      title:           '👥 Invite client to edit',
      subtitle:        'Your client can sign in and edit text, prices, contact info',
      emailLabel:      'Client email',
      emailPlaceholder:'e.g.: owner@cafelinh.com',
      emailHint:       'Client will receive a link → sign in with this email → edit their website',
      createButton:    '📩 Create invite link',
      createButtonReinvite: 'Create NEW link (revoke old)',
      creating:        'Creating link...',
      createSuccess:   '✓ Link created. Copy and send to your client.',
      linkLabel:       'Invite link (send to client)',
      copyButton:      '📋 Copy',
      zaloButton:      '💬 Send via Zalo',
      emailButton:     '✉️ Send via Email',
      acceptedTitle:   'Client accepted',
      acceptedSince:   'Since:',
      pendingTitle:    '⏳ Invite sent — waiting for accept',
      pendingExpires:  'Expires:',
      revokeButton:    'Revoke',
      revokeConfirm:   'Revoke client edit access? They will no longer be able to access.',
      revokeSuccess:   'Client access revoked',
      noteTitle:       'Note:',
      noteExpire:      'Link expires in 30 days',
      noteEmail:       'Client must sign in with the email',
      notePermission:  'Client can only edit text — no delete, no AI, no billing',
    },

    clientAccept: {
      title:           'You are invited to edit a website',
      project:         'Project:',
      emailLabel:      'Invited email',
      emailHint:       '⚠️ You must sign in with this exact email. Other emails will not work.',
      sendLink:        'Send sign-in link →',
      magicLinkSent:   'Sign-in link sent',
      magicLinkDesc:   'Check your email, click the link to continue.',
      checkSpam:       'No email? Check Spam/Promotions folder.',
      acceptingTitle:  'Almost done!',
      acceptingDesc:   'You are signed in as',
      enterProject:    'Enter project →',
      invalidTitle:    'Invalid invite link',
      backHome:        '← Back to home',
      verifying:       'Verifying...',
      poweredBy:       'Powered by DaisanAI Lite',
      clientModeTag:   'Client edit mode',
    },

    clientSidebar: {
      youAreEditing:   'You are editing',
      guideTitle:      '💡 How to edit',
      guideStep1:      'Click',
      guideStep1End:   'on the toolbar',
      guideStep2:      'Hover text, click to edit',
      guideStep3:      'Click',
      guideStep3End:   'to save',
      permsTitle:      'Your permissions',
      perm1:           '✓ Edit text (names, prices, descriptions)',
      perm2:           '✓ View all pages',
      perm3:           '✗ Cannot delete or create',
      perm4:           '✗ Cannot use AI',
      contactOwner:    'Contact DaisanAI owner for complex changes',
    },
  }
}

/**
 * Translate a key path like 'header.title' for the given language.
 * Falls back to VN if not found in target language.
 * Returns the key itself if missing in both (warning to dev).
 */
export function translate(lang, keyPath) {
  const parts = keyPath.split('.')
  // Try target language first
  let cur = TRANSLATIONS[lang]
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
    else { cur = undefined; break }
  }
  if (typeof cur === 'string') return cur

  // Fallback to Vietnamese
  cur = TRANSLATIONS.vi
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
    else { cur = undefined; break }
  }
  if (typeof cur === 'string') return cur

  // Last resort: return the key (dev will notice)
  if (typeof window !== 'undefined' && window.localStorage?.getItem('debug_i18n') === '1') {
    console.warn('[i18n] Missing key:', keyPath)
  }
  return keyPath
}

export const SUPPORTED_LANGUAGES = [
  { code: 'vi', name: 'Tieng Viet', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
]
