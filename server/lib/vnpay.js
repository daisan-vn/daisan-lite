// ========================================================================
//  server/lib/vnpay.js — VNPay payment helpers
// ========================================================================
//  Refs:
//    - https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop/
//    - HMAC-SHA512 signature
//    - Test cards co trong tai lieu sandbox
// ========================================================================

import crypto from 'crypto'
import querystring from 'querystring'

// ─── Kiem tra config VNPay co san khong ─────────────────────────────────
export function isVnpayConfigured() {
  return !!(
    process.env.VNP_TMN_CODE &&
    process.env.VNP_HASH_SECRET &&
    process.env.VNP_URL
  )
}

// ─── Sort object alphabetically (yeu cau cua VNPay) ──────────────────────
function sortObject(obj) {
  const sorted = {}
  const keys = Object.keys(obj).sort()
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      sorted[key] = obj[key]
    }
  }
  return sorted
}

// ─── Format date YYYYMMDDHHmmss ─────────────────────────────────────────
function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
}

// ─── Tao URL thanh toan ─────────────────────────────────────────────────
export function createPaymentUrl({
  amountVnd,         // so tien (VND) - vi du 149000
  orderId,           // unique txn ref - tu sinh
  orderInfo,         // mo ta giao dich
  ipAddr,            // IP cua user
  returnUrl,         // URL VNPay redirect ve sau khi thanh toan
  locale = 'vn'
}) {
  if (!isVnpayConfigured()) {
    throw new Error('VNPay chua duoc cau hinh trong .env')
  }

  const createDate = formatDate(new Date())
  const expireDate = formatDate(new Date(Date.now() + 15 * 60 * 1000))  // 15 phut

  const vnp_Params = {
    vnp_Version:    '2.1.0',
    vnp_Command:    'pay',
    vnp_TmnCode:    process.env.VNP_TMN_CODE,
    vnp_Locale:     locale,
    vnp_CurrCode:   'VND',
    vnp_TxnRef:     orderId,
    vnp_OrderInfo:  orderInfo,
    vnp_OrderType:  'other',
    vnp_Amount:     amountVnd * 100,           // VNPay dung don vi nho nhat
    vnp_ReturnUrl:  returnUrl,
    vnp_IpAddr:     ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate
  }

  // Sort + sign
  const sorted = sortObject(vnp_Params)
  const signData = querystring.stringify(sorted, { encode: false })

  const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET)
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  sorted.vnp_SecureHash = signed

  const url = `${process.env.VNP_URL}?${querystring.stringify(sorted)}`
  return url
}

// ─── Verify return URL params tu VNPay ──────────────────────────────────
export function verifyReturn(query) {
  if (!isVnpayConfigured()) {
    return { valid: false, reason: 'VNPay not configured' }
  }

  // Tach hash khoi params
  const incoming = { ...query }
  const secureHash = incoming.vnp_SecureHash
  delete incoming.vnp_SecureHash
  delete incoming.vnp_SecureHashType

  if (!secureHash) return { valid: false, reason: 'Missing vnp_SecureHash' }

  // Sort + sign lai voi key cua minh
  const sorted = sortObject(incoming)
  const signData = querystring.stringify(sorted, { encode: false })

  const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET)
  const expected = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  const valid = expected === secureHash
  return {
    valid,
    txnRef:           incoming.vnp_TxnRef,
    transactionNo:    incoming.vnp_TransactionNo,
    responseCode:     incoming.vnp_ResponseCode,
    transactionStatus:incoming.vnp_TransactionStatus,
    bankCode:         incoming.vnp_BankCode,
    amount:           incoming.vnp_Amount ? parseInt(incoming.vnp_Amount) / 100 : null,
    orderInfo:        incoming.vnp_OrderInfo,
    payDate:          incoming.vnp_PayDate,
    rawParams:        incoming
  }
}

// ─── Decode VNPay response code ─────────────────────────────────────────
export const VNP_RESPONSE_CODES = {
  '00': 'Giao dich thanh cong',
  '07': 'Tru tien thanh cong. Giao dich bi nghi ngo (lien quan toi lua dao)',
  '09': 'The/Tai khoan chua dang ky dich vu InternetBanking',
  '10': 'Xac thuc thong tin sai qua 3 lan',
  '11': 'Da het han cho thanh toan',
  '12': 'The/Tai khoan bi khoa',
  '13': 'Sai OTP',
  '24': 'Khach hang huy giao dich',
  '51': 'Tai khoan khong du so du',
  '65': 'Tai khoan da vuot qua han muc giao dich trong ngay',
  '75': 'Ngan hang thanh toan dang bao tri',
  '79': 'Sai mat khau thanh toan qua so lan quy dinh',
  '99': 'Loi khong xac dinh'
}

export function decodeResponseCode(code) {
  return VNP_RESPONSE_CODES[code] || `Loi khong xac dinh (${code})`
}
