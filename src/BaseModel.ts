import { mapper } from './lib/mapper'
import { unwrapNumbers } from './lib/ddb'
export { mapper }
import { deepClone } from '@visulima/deep-clone'

export class BaseModel {
  public id: string
  public createdAt: number
  public updatedAt: number
  public deletedAt: number
  public deletedReason: string

  /**
   * Creates a new User from existing properties
   * @param obj The properties from which to create a new User
   * @returns a new User instance
   */
  public static from<T extends BaseModel>(obj: Partial<T>): T {
    const model = new this() as T
    const partialModel = deepClone(obj)
    Object.assign(model, partialModel)
    return model
  }

  /**
   * Gets an instance of User from the database by its `id` value.
   * @param keyObject
   * @param indexName
   * @param strongConsistent
   */
  public static async get<T extends BaseModel>(
    keyObject: { [key: string]: any },
    indexName?: string,
    strongConsistent?: boolean,
  ): Promise<T> {
    let partial: Partial<T>
    if (!indexName) {
      const queryObj = new this() as T
      Object.assign(queryObj, keyObject)
      partial = await mapper
        .get(queryObj, {
          readConsistency: strongConsistent ? 'strong' : 'eventual',
        })
        .then(unwrapNumbers)
    } else {
      for await (const result of mapper.query(this, keyObject, {
        indexName,
        readConsistency: strongConsistent ? 'strong' : 'eventual',
      })) {
        partial = unwrapNumbers(result as T)
      }
    }
    return this.from(partial)
  }

  /**
   * Deletes this user by its `id` property.
   */
  public async softDelete<T extends BaseModel>(reason?: string): Promise<T> {
    this.deletedReason = reason
    this.deletedAt = Date.now()
    return await this.save()
  }

  /**
   * Deletes this user by its `id` property.
   */
  public async hardDelete(): Promise<void> {
    const toDelete = this.constructor.prototype.from({ id: this.id })
    await mapper.delete(toDelete)
  }

  /**
   * Saves the user back to the database, generating any default or
   * auto-generated properties and adding them back to this user object
   * in-place.
   */
  public async save<T extends BaseModel>(): Promise<T> {
    this.updatedAt = Date.now()
    const saved = await mapper.put(this)
    const savedCopy = deepClone(saved)
    Object.assign(this, savedCopy)
    return this as unknown as T
  }
}
