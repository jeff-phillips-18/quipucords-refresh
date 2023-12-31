import React from 'react';
import { PropertyPath } from 'lodash';
import _get from 'lodash/get';
import _set from 'lodash/set';
import moment from 'moment';

const aggregatedError = (errors: any, message: any, { name = 'AggregateError' } = {}) => {
  const { AggregateError, Error } = window as any;
  let err;

  if (AggregateError) {
    err = new AggregateError(errors, message);
  } else {
    err = new Error(message);
    err.name = name;
    err.errors = (Array.isArray(errors) && errors) || [errors];
    err.isEmulated = true;
  }
  return err;
};

const copyClipboard = text => {
  let successful;
  const win = window as any;

  try {
    win.getSelection().removeAllRanges();

    const newTextarea = win.document.createElement('pre');
    newTextarea.appendChild(win.document.createTextNode(text));

    newTextarea.style.position = 'absolute';
    newTextarea.style.top = '-9999px';
    newTextarea.style.left = '-9999px';

    const range = win.document.createRange();
    win.document.body.appendChild(newTextarea);

    range.selectNode(newTextarea);

    win.getSelection().addRange(range);

    successful = win.document.execCommand('copy');

    win.document.body.removeChild(newTextarea);
    win.getSelection().removeAllRanges();
  } catch (e) {
    successful = null;

    if (process.env.REACT_APP_ENV !== 'test') {
      console.warn('Copy to clipboard failed.', (e as any).message);
    }
  }

  return successful;
};

const devModeNormalizeCount = (count: number, modulus = 100) => Math.abs(count) % modulus;

const downloadData = (data = '', fileName = 'download.txt', fileType = 'text/plain') =>
  new Promise((resolve, reject) => {
    const navigator = window.navigator as any;
    try {
      const blob = new Blob([data], { type: fileType });

      if (navigator && navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, fileName);
        resolve({ fileName, data });
      } else {
        const anchorTag = window.document.createElement('a');

        anchorTag.href = window.URL.createObjectURL(blob);
        anchorTag.style.display = 'none';
        anchorTag.download = fileName;

        window.document.body.appendChild(anchorTag);

        anchorTag.click();

        setTimeout(() => {
          window.document.body.removeChild(anchorTag);
          window.URL.revokeObjectURL(blob as any);
          resolve({ fileName, data });
        }, 250);
      }
    } catch (error) {
      reject(error);
    }
  });

const generateId = (prefix: string): string =>
  `${prefix || 'generatedid'}-${(process.env.REACT_APP_ENV !== 'test' && Math.ceil(1e5 * Math.random())) || ''}`;

const noopTranslate = (
  key: string | string[],
  value: string | string[],
  components: readonly React.ReactElement[] | { readonly [tagName: string]: React.ReactElement }
): string => {
  const updatedKey = (Array.isArray(key) && `[${key}]`) || key;
  const updatedValue =
    (typeof value === 'string' && value) ||
    (Array.isArray(value) && `[${value}]`) ||
    (Object.keys(value || '').length && JSON.stringify(value)) ||
    '';
  const updatedComponents = (components && `${components}`) || '';

  return `t(${updatedKey}${(updatedValue && `, ${updatedValue}`) || ''}${
    (updatedComponents && `, ${updatedComponents}`) || ''
  })`;
};

const setPropIfDefined = (obj: any, props: PropertyPath, value: any) =>
  obj && value !== undefined ? _set(obj, props, value) : obj;

const setPropIfTruthy = (obj: any, props: PropertyPath, value: any) => (obj && value ? _set(obj, props, value) : obj);

const getMessageFromResults = (
  results: { status: any; statusText: string; message: string; detail: any },
  filter = null
) => {
  const status: number = _get(results, 'response.status', results.status);
  const statusResponse: string = _get(results, 'response.statusText', results.statusText);
  const messageResponse: string = _get(results, 'response.data', results.message);
  const detailResponse = _get(results, 'response.data', results.detail);
  const requestUrl: string | null = _get(results, 'config.url', null);

  const messages = {
    messages: { message: '' },
    message: '',
    status: status || 0,
    url: requestUrl
  };

  const displayStatus = status >= 500 ? `${status} ` : '';

  if (!messageResponse && !detailResponse) {
    if (status < 400) {
      messages.message = statusResponse;
      return messages;
    }

    if (status >= 500 || status === undefined) {
      messages.message = `${status || ''} Server is currently unable to handle this request.`;
      return messages;
    }
  }

  if (status >= 500 && /Request\sURL:/.test(messageResponse)) {
    messages.message = `${status} ${messageResponse.split(/Request\sURL:/)[0]}`;
    return messages;
  }

  if (status === 404) {
    messages.message = `404 Not Found`;
    return messages;
  }

  if (typeof messageResponse === 'string') {
    messages.message = `${displayStatus}${messageResponse}`;
    return messages;
  }

  if (typeof detailResponse === 'string') {
    messages.message = `${displayStatus}${detailResponse}`;
    return messages;
  }

  const getMessages = messageObjectArrayString => {
    const parsed = {};

    if (messageObjectArrayString && typeof messageObjectArrayString === 'string') {
      return messageObjectArrayString.replace(/\[object\sObject]/g, '');
    }

    if (Array.isArray(messageObjectArrayString)) {
      return getMessages(messageObjectArrayString.join('\n'));
    }

    Object.keys(messageObjectArrayString).forEach(key => {
      parsed[key] = getMessages(messageObjectArrayString[key]);
    });

    return parsed;
  };

  const filtered = (messageObjectArrayString, filterField) => {
    const parsed = {};
    const str = JSON.stringify(messageObjectArrayString);
    const filterFields = (Array.isArray(filterField) && filterField) || (filterField && [filterField]) || [];

    filterFields.forEach(val => {
      const match = str.match(new RegExp(`"${val}":(\\[(.*?)]]?|{(.*?)}]?|"(.*?)"),?`));

      if (match && match[1]) {
        parsed[val] = match[1]; // eslint-disable-line

        if (match && match[2]) {
          parsed[val] = JSON.parse(match[1]);

          if (Array.isArray(parsed[val])) {
            parsed[val] = parsed[val].join(', ');
          } else if (typeof parsed[val] !== 'string') {
            parsed[val] = Object.values(parsed[val]).join(', ');
          }

          parsed[val] = parsed[val].replace(/,?\s?\[object\sObject]/, '');
        }
      }
    });

    return parsed;
  };

  messages.messages =
    (filter && filtered(messageResponse || detailResponse, filter)) || getMessages(messageResponse || detailResponse);
  messages.message = `${displayStatus}${Object.values(messages.messages).join('\n')}`;

  if (messages.message === '[object Object]') {
    messages.message = JSON.stringify(messages.messages);
  } else {
    messages.message = messages.message.replace(/\n?\[object\sObject]/g, '');
  }

  return messages;
};
const getStatusFromResults = results => {
  let status = _get(results, 'response.status', results.status);

  if (status === undefined) {
    status = 0;
  }

  return status;
};

const getTimeStampFromResults =
  process.env.REACT_APP_ENV !== 'test'
    ? results => moment(_get(results, 'headers.date', Date.now())).format('YYYYMMDD_HHmmss')
    : () => '20190225_164640';

const getTimeDisplayHowLongAgo =
  process.env.REACT_APP_ENV !== 'test'
    ? timestamp => moment.utc(timestamp).utcOffset(moment().utcOffset()).fromNow()
    : () => 'a day ago';

const isIpAddress = (name: string): boolean => {
  const vals = name.split('.');
  if (vals.length === 4) {
    return vals.find(val => Number.isNaN(val)) === undefined;
  }
  return false;
};

const ipAddressValue = (name: string): number => {
  const values = name.split('.');
  return (
    parseInt(values[0], 10) * 0x1000000 +
    parseInt(values[1], 10) * 0x10000 +
    parseInt(values[2], 10) * 0x100 +
    parseInt(values[3], 10)
  );
};

const DEV_MODE = process.env.REACT_APP_ENV === 'development';

const PROD_MODE = process.env.REACT_APP_ENV === 'production';

const TEST_MODE = process.env.REACT_APP_ENV === 'test';

const UI_BRAND = process.env.REACT_APP_UI_BRAND === 'true';

const UI_NAME = UI_BRAND ? process.env.REACT_APP_UI_BRAND_NAME : process.env.REACT_APP_UI_NAME;

const UI_SENTENCE_START_NAME = UI_BRAND
  ? process.env.REACT_APP_UI_BRAND_SENTENCE_START_NAME
  : process.env.REACT_APP_UI_SENTENCE_START_NAME;

const UI_SHORT_NAME = UI_BRAND ? process.env.REACT_APP_UI_BRAND_SHORT_NAME : process.env.REACT_APP_UI_SHORT_NAME;

const UI_VERSION = process.env.REACT_APP_UI_VERSION;

const TOAST_NOTIFICATIONS_TIMEOUT =
  (process.env.REACT_APP_TOAST_NOTIFICATIONS_TIMEOUT &&
    Number.parseInt(process.env.REACT_APP_TOAST_NOTIFICATIONS_TIMEOUT, 10)) ||
  undefined;

const POLL_INTERVAL =
  (process.env.REACT_APP_POLL_INTERVAL && Number.parseInt(process.env.REACT_APP_POLL_INTERVAL, 10)) || undefined;

const getCurrentDate = () => (TEST_MODE && moment.utc('20220601').toDate()) || moment.utc().toDate();

const helpers = {
  aggregatedError,
  copyClipboard,
  devModeNormalizeCount,
  downloadData,
  generateId,
  noopTranslate,
  setPropIfDefined,
  setPropIfTruthy,
  getMessageFromResults,
  getStatusFromResults,
  getTimeStampFromResults,
  getTimeDisplayHowLongAgo,
  isIpAddress,
  ipAddressValue,
  DEV_MODE,
  POLL_INTERVAL,
  PROD_MODE,
  TEST_MODE,
  TOAST_NOTIFICATIONS_TIMEOUT,
  UI_BRAND,
  UI_NAME,
  UI_SENTENCE_START_NAME,
  UI_SHORT_NAME,
  UI_VERSION,
  getCurrentDate
};

export { helpers as default, helpers };
