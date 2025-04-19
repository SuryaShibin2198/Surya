import mongoose from 'mongoose';
import NodeValidator from 'node-input-validator';

NodeValidator.extend('unique', async (details: any) => {
  const condition: any = { deletedAt: false, deleted_at: false };
  const model = details.args[0];
  const field = details.args[1];
  const ignoreId = details.args[2] ?? null;
  const matchfield = details.args[3] ?? null;
  const matchId = details.args[4] ?? null;
  const exist = await mongoose
    .model(model)
    .exists({ _id: ignoreId })
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
  if (typeof details.value === 'string')
    condition[field] = new RegExp('^' + details.value + '$', 'i');
  else condition[field] = details.value;
  if (exist) {
    condition['_id'] = { $ne: new mongoose.Types.ObjectId(ignoreId) };
  }
  if (matchfield && matchId) {
    condition[matchfield] = { $eq: new mongoose.Types.ObjectId(matchId) };
  }
  const agg = mongoose.model(model).aggregate().match(condition).limit(1);
  const aggExist = await agg.exec();
  if (aggExist.length != 0) return false;
  return true;
});

NodeValidator.extend('exists', async (details: any) => {
  const condition: any = {};
  const model = details.args[0];
  const field = details.args[1];
  condition[field] = details.value;
  if (field == '_id' && !mongoose.Types.ObjectId.isValid(details.value))
    return false;
  const Exists = await mongoose.model(model).findOne(condition);
  return Exists ? true : false;
});

NodeValidator.extend('objectId', async (details: any) => {
  return mongoose.Types.ObjectId.isValid(details.value);
});
