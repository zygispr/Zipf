import { describe, expect, it } from 'vitest';
import { xhtmlToText } from './xhtmlToText';

const words = (text: string) => text.split(/\s+/).filter(Boolean);

describe('xhtmlToText', () => {
  it('removes head, script, and style contents', () => {
    const xhtml =
      '<html><head><title>Title</title></head><body><script>run()</script>' +
      '<style>p { color: red }</style><p>hello</p></body></html>';
    expect(words(xhtmlToText(xhtml))).toEqual(['hello']);
  });

  it('removes script and style regardless of case, attributes, or self-closing form', () => {
    const xhtml = '<SCRIPT type="x">bad()</SCRIPT>one<script src="a.js"/>two<style/>three';
    expect(words(xhtmlToText(xhtml))).toEqual(['one', 'two', 'three']);
  });

  it('turns tags into spaces so adjacent paragraphs stay separate words', () => {
    expect(words(xhtmlToText('<p>word</p><p>next</p>'))).toEqual(['word', 'next']);
  });

  it('handles self-closing tags', () => {
    expect(words(xhtmlToText('one<br/>two<img src="a.png" alt="x" />three'))).toEqual([
      'one',
      'two',
      'three',
    ]);
  });

  it('removes comments', () => {
    expect(words(xhtmlToText('<!-- secret words -->visible'))).toEqual(['visible']);
  });

  it('decodes named entities', () => {
    expect(xhtmlToText('a&amp;b&nbsp;c&mdash;d&rsquo;e &eacute;&Eacute;&lt;&gt;&quot;&apos;')).toBe(
      'a&b c—d’e éÉ<>"\'',
    );
  });

  it('decodes decimal and hex entities', () => {
    expect(xhtmlToText('&#8217;&#x2019;&#X2019;&#233;')).toBe('’’’é');
  });

  it('replaces invalid numeric entities with U+FFFD', () => {
    expect(xhtmlToText('&#xD800;&#1114112;')).toBe('��');
  });

  it('drops unknown named entities instead of counting their names', () => {
    expect(words(xhtmlToText('one&bogus;two'))).toEqual(['one', 'two']);
  });

  it('unwraps CDATA as text', () => {
    expect(xhtmlToText('<p><![CDATA[a < b & c]]></p>').trim()).toBe('a < b & c');
  });

  it('removes the XML declaration and doctype', () => {
    expect(words(xhtmlToText('<?xml version="1.0"?><!DOCTYPE html><p>text</p>'))).toEqual(['text']);
  });
});
