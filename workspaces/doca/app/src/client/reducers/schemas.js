import Immutable from 'immutable';
import { ACTIONS } from '../constants';

const schemas = (state = new Immutable.List(), action) => {
  switch (action.type) {
    case ACTIONS.REINIT_SCHEMAS: {
      if (state.count() !== action.payload.count()) {
        return action.payload;
      }

      return state.map((schema, key) => {
        if (schema.equals(action.payload.get(key))) {
          return schema;
        }
        return action.payload.get(key);
      });
    }
    default:
      return state;
  }
};

export default schemas;
