import { describe, it, expect } from 'vitest'
import { normalizeUrl, getHostname, isValidTargetUrl } from './url'

describe('normalizeUrl', () => {
  it('prepends https:// to a bare domain', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com')
  })

  it('preserves an existing http:// protocol', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
  })

  it('strips a trailing slash from a bare-path URL', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com')
  })
})

describe('getHostname', () => {
  it('strips leading www.', () => {
    expect(getHostname('https://www.example.com')).toBe('example.com')
  })

  it('returns hostname for bare domain input', () => {
    expect(getHostname('example.com')).toBe('example.com')
  })
})

describe('isValidTargetUrl', () => {
  it('accepts a bare domain', () => {
    expect(isValidTargetUrl('example.com')).toBe(true)
  })

  it('accepts a full https URL with path', () => {
    expect(isValidTargetUrl('https://foo.co.uk/path')).toBe(true)
  })

  it('rejects localhost', () => {
    expect(isValidTargetUrl('localhost')).toBe(false)
  })

  it('rejects loopback IP', () => {
    expect(isValidTargetUrl('127.0.0.1')).toBe(false)
  })

  it('rejects private class A', () => {
    expect(isValidTargetUrl('10.0.0.5')).toBe(false)
  })

  it('rejects private class C', () => {
    expect(isValidTargetUrl('192.168.1.1')).toBe(false)
  })

  it('rejects link-local', () => {
    expect(isValidTargetUrl('169.254.1.1')).toBe(false)
  })

  it('rejects private class B', () => {
    expect(isValidTargetUrl('172.20.1.1')).toBe(false)
  })

  it('rejects IPv6 loopback', () => {
    expect(isValidTargetUrl('::1')).toBe(false)
  })

  it('rejects .local hostnames', () => {
    expect(isValidTargetUrl('foo.local')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidTargetUrl('')).toBe(false)
  })

  it('rejects javascript: protocol', () => {
    expect(isValidTargetUrl('javascript:alert(1)')).toBe(false)
  })
})
