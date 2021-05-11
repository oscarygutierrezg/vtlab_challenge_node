import Deliveries from '@/models/Deliveries.model';
import Products from '@/models/Products.model';
import moment from 'moment';

const find = async (req) => {
  // some vars
  let query = {};
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 }

  // if date provided, filter by date

  if (req.body.when) {
    query['when'] = {
      '$gte': req.body.when
    }
  };

  let totalResults = await Deliveries.find(query).countDocuments();

  if (totalResults < 1) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find any delivery`
      }
    }
  }

  let deliveries = await Deliveries.find(query).skip(skip).sort(sort).limit(limit);

  return {
    totalResults: totalResults,
    deliveries
  }
}


const findFilter = async (req) => {
  // some vars
  let query = {};
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 }

  // if date provided, filter by date
  if (req.body.dateFrom && req.body.dateTo) {
    query['when'] = {
      '$gte': req.body.dateFrom,
      '$lt': req.body.dateTo
    }
  }

  let totalResults = await Deliveries.find(query).countDocuments();

  if (totalResults < 1) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find any delivery`
      }
    }
  }
  if (req.body.weight) {
    let dateFrom = moment(req.body.dateFrom);
    let dateTo = moment(req.body.dateTo);
    let match =  { $match: { when :{ 
      $gt: dateFrom.toDate(),
      $lt: dateTo.toDate()
    }} };
    let lookup =  {   $lookup:
      {
        from: 'products',
        let: { products: '$products' },
        pipeline: [
           { $match:
              { $expr:
                 { $and:
                    [
                      { $in: [ '$_id',  '$$products' ] },
                      { $gte: [ '$weight', req.body.weight ] }
                    ]
                 }
              }
           }
        ],
        as: 'products'
      }};
    let queryProducts = [match,lookup];


    let totalResults = await Deliveries.aggregate(queryProducts).count('count');

    if (totalResults.length < 1 || parseInt(totalResults[0].count,10) < 1) {
      throw {
        code: 404,
        data: {
          message: `We couldn't find any delivery`
        }
      }
    }

    let deliveries = await Deliveries.aggregate(queryProducts).skip(skip).sort(sort).limit(limit);
    return {
      totalResults: totalResults[0].count,
      deliveries
    }
  }
  let deliveries = await Deliveries.find(query).skip(skip).sort(sort).limit(limit);

  return {
    totalResults: totalResults,
    deliveries
  }
}




const create = async (req) => {
  try {
    await Deliveries.create(req.body);
  } catch (e) {
    throw {
      code: 400,
      data: {
        message: `An error has occurred trying to create the delivery:
          ${JSON.stringify(e, null, 2)}`
      }
    }
  }
}

const findOne = async (req) => {
  let delivery = await Deliveries.findOne({_id: req.body.id});
  if (!delivery) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find a delivery with the sent ID`
      }
    }
  }
  return delivery;
}

export default {
  find,
  create,
  findOne,
  findFilter
}
