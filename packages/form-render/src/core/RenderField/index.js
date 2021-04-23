import React, { useEffect, useRef } from 'react';
import { useStore } from '../../hooks';
import useDebouncedCallback from '../../useDebounce';
import {
  getDataPath,
  getValueByPath,
  isCheckBoxType,
  isObjType,
  schemaContainsExpression,
  parseAllExpression,
  clone,
} from '../../utils';
import ErrorMessage from './ErrorMessage';
import FieldTitle from './Title';
import ExtendedWidget from './ExtendedWidget';

// TODO: 之后不要直接用get，收口到一个内部方法getValue，便于全局 ctrl + f 查找
const RenderField = props => {
  const {
    $id,
    dataIndex,
    item,
    labelClass,
    labelStyle,
    contentClass: _contentClass,
    hasChildren,
    children,
    errorFields = [],
    hideTitle,
    displayType,
  } = props;

  const { schema } = item;
  const store = useStore();
  const {
    onItemChange,
    formData,
    isEditing,
    setEditing,
    touchKey,
    debounceInput,
    readOnly,
  } = store;
  // console.log('<renderField>', $id);
  const snapShot = useRef();
  let dataPath = getDataPath($id, dataIndex);
  let _schema = clone(schema); // TODO: 用deepClone，函数啥的才能正常copy，但是deepClone的代价是不是有点大，是否应该让用户避免schema里写函数

  // 节流部分逻辑，编辑时不执行
  if (isEditing && snapShot.current) {
    _schema = snapShot.current;
  } else {
    if (schemaContainsExpression(_schema)) {
      _schema = parseAllExpression(_schema, formData, dataPath);
    }
    snapShot.current = _schema;

    // rules 还是放在 schema 里统一处理
    // _rules = getArray(item.rules).map(rule => {
    //   const newRule = {};
    //   Object.keys(rule).forEach(key => {
    //     const needParse = isExpression(rule[key]);
    //     newRule[key] = needParse
    //       ? parseSingleExpression(rule[key], formData, dataPath)
    //       : rule[key];
    //   });
    //   return newRule;
    // });
  }

  const errObj = errorFields.find(err => err.name === dataPath);
  const errorMessage = errObj && errObj.error; // 是一个list
  const hasError = Array.isArray(errorMessage) && errorMessage.length > 0;
  // 补上这个class，会自动让下面所有的展示ui变红！
  const contentClass = hasError
    ? _contentClass + ' ant-form-item-has-error'
    : _contentClass;

  const _value = getValueByPath(formData, dataPath);

  const _getValue = path => {
    if (path === '#' || !path) {
      return formData;
    } else if (typeof path === 'string') {
      return getValueByPath(formData, path);
    } else {
      console.error('path has to be a string');
    }
  };

  let contentStyle = {};

  const debouncedSetEditing = useDebouncedCallback(setEditing, 350);

  const _readOnly = readOnly !== undefined ? readOnly : _schema.readOnly;

  // TODO: 优化一下，只有touch还是false的时候，setTouched
  const onChange = value => {
    // 动过的key，算被touch了
    touchKey(dataPath);
    // 开始编辑，节流
    if (debounceInput) {
      setEditing(true);
      debouncedSetEditing(false);
    }
    if (typeof dataPath === 'string') {
      onItemChange(dataPath, value);
    }
  };

  const titleProps = {
    labelClass,
    labelStyle: labelStyle,
    schema: _schema,
    displayType,
  };

  const hideValidation = displayType === 'inline' || _readOnly === true;

  const messageProps = {
    message: errorMessage,
    schema: _schema,
    displayType,
    hideValidation: hideValidation,
  };

  const placeholderTitleProps = {
    className: labelClass,
    style: labelStyle,
  };

  const _showTitle = !hideTitle && !!_schema.title;
  // TODO: 这块最好能判断上一层是list1，
  if (hideTitle && _schema.title) {
    _schema.placeholder = _schema.placeholder || _schema.title;
  }

  const widgetProps = {
    schema: _schema,
    readOnly: _readOnly,
    onChange,
    getValue: _getValue,
    formData,
    value: _value,
    onItemChange,
    dataIndex,
    dataPath,
  };

  widgetProps.children = hasChildren
    ? children
    : isCheckBoxType(_schema, _readOnly)
    ? _schema.title
    : null;
  // if (_schema && _schema.default !== undefined) {
  //   widgetProps.value = _schema.default;
  // }

  if (_schema.hidden) {
    return null;
  }

  // checkbox必须单独处理，布局太不同了
  if (isCheckBoxType(_schema, _readOnly)) {
    return (
      <>
        {_showTitle && <div {...placeholderTitleProps} />}
        <div className={contentClass} style={contentStyle}>
          <ExtendedWidget {...widgetProps} />
          <ErrorMessage {...messageProps} />
        </div>
      </>
    );
  }

  let titleElement = <FieldTitle {...titleProps} />;

  if (isObjType(_schema)) {
    titleElement = (
      <div style={{ display: 'flex' }}>
        {titleElement}
        <ErrorMessage {...messageProps} />
      </div>
    );
    return (
      <div className={contentClass} style={contentStyle}>
        <ExtendedWidget
          {...widgetProps}
          message={errorMessage}
          title={_showTitle ? titleElement : undefined}
        />
      </div>
    );
  }

  return (
    <>
      {_showTitle && titleElement}
      <div
        className={`${contentClass} ${hideTitle ? 'fr-content-no-title' : ''}`}
        style={contentStyle}
      >
        <ExtendedWidget {...widgetProps} />
        <ErrorMessage {...messageProps} />
      </div>
    </>
  );
};

export default RenderField;