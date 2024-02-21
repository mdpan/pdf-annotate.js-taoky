import { addEventListener, removeEventListener, fireEvent, removeAllEventListener, enableUI, disableUI } from './event';
import { disableEdit, enableEdit, createEditOverlay, destroyEditOverlay } from './edit';
import { disablePen, enablePen, setPen } from './pen';
import { disableArrow, enableArrow, setArrow } from './arrow';
import { disableEraser, enableEraser } from './eraser';
import { disablePoint, enablePoint, setPoint } from './point';
import { disableRect, enableRect } from './rect';
import { disableCircle, enableCircle, setCircle, addCircle } from './circle';
import { disableText, enableText, setText } from './text';
import { createPage, renderPage, rerenderAnnotations } from './page';
import { disableSignature, enableSignature } from './signature';
import { disableSignimg, enableSignimg } from './signimg';

export default {
  addEventListener,
  removeEventListener,
  fireEvent,
  removeAllEventListener,
  enableUI,
  disableUI,

  disableEdit,
  enableEdit,
  createEditOverlay,
  destroyEditOverlay,

  disablePen,
  enablePen,
  setPen,

  disablePoint,
  enablePoint,
  setPoint,

  disableRect,
  enableRect,

  disableCircle,
  enableCircle,
  setCircle,
  addCircle,

  disableArrow,
  enableArrow,
  setArrow,

  disableEraser,
  enableEraser,

  disableText,
  enableText,
  setText,

  disableSignature, enableSignature,
  disableSignimg, enableSignimg,

  createPage,
  renderPage,
  rerenderAnnotations
};
