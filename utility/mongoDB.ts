import mongoose, {
    Document,
    Model,
    Schema,
    PipelineStage,
    ClientSession,
    DeleteResult,
    UpdateResult,
    SyncIndexesOptions,
    ProjectionType,
    QueryOptions,
    RootFilterQuery
} from 'mongoose'

export default class mgDB {
    private readonly url: string | null = null

    constructor(dbUrl: string) {
        this.url = dbUrl
    }

    async connect(): Promise<void> {
        if (!this.url) throw new Error('数据库连接字符串为空')
        try {
            await mongoose.connect(this.url)
            console.log('💕 Database connection successful')
        } catch (err) {
            throw new Error(`😕 Database connection failed: ${err}`)
        }
    }

    private _getModel<T = any>(collectionName: string): Model<Document<T>> {
        try {
            return mongoose.model<Document<T>>(collectionName)
        } catch {
            return mongoose.model<Document<T>>(
                collectionName,
                new Schema({}, { strict: false })
            )
        }
    }

    // -------------------- CRUD --------------------

    async insertOne<T = any>(
        collectionName: string,
        doc: Partial<T>
    ): Promise<Document<T>> {
        const Model = this._getModel<T>(collectionName)
        return Model.create(doc)
    }

    async insertMany<T = any>(
        collectionName: string,
        docs: Partial<T>[]
    ): Promise<Document<T>[]> {
        const Model = this._getModel<T>(collectionName)
        // Cast the result to the expected type
        const result = await Model.insertMany(docs)
        return result as unknown as Document<T>[]
    }

    async findOne<T = any>(
        collectionName: string,
        condition: RootFilterQuery<Document<T>>
    ): Promise<T | null> {
        const Model = this._getModel<T>(collectionName)
        return Model.findOne(condition).lean<T>().exec()
    }

    async findMany<T = any>(
        collectionName: string,
        condition: RootFilterQuery<Document<T>>,
        projection?: ProjectionType<Document<T>> | null,
        options?: QueryOptions<Document<T>>
    ): Promise<T[]> {
        const Model = this._getModel<T>(collectionName)
        return Model.find(condition, projection, options).lean<T[]>().exec()
    }

    async updateOne<T = any>(
        collectionName: string,
        condition: RootFilterQuery<Document<T>>,
        update: object,
        options: object = {}
    ): Promise<UpdateResult> {
        const Model = this._getModel<T>(collectionName)
        return Model.updateOne(condition, update, options)
    }

    async updateMany<T = any>(
        collectionName: string,
        condition: RootFilterQuery<Document<T>>,
        update: object,
        options: object = {}
    ): Promise<UpdateResult> {
        const Model = this._getModel<T>(collectionName)
        return Model.updateMany(condition, update, options)
    }

    async deleteOne<T = any>(
        collectionName: string,
        condition: RootFilterQuery<Document<T>>
    ): Promise<DeleteResult> {
        const Model = this._getModel<T>(collectionName)
        return Model.deleteOne(condition)
    }

    async deleteMany<T = any>(
        collectionName: string,
        condition: RootFilterQuery<Document<T>>
    ): Promise<DeleteResult> {
        const Model = this._getModel<T>(collectionName)
        return Model.deleteMany(condition)
    }

    // -------------------- 其他功能 --------------------

    async count<T = any>(
        collectionName: string,
        condition: RootFilterQuery<Document<T>> = {}
    ): Promise<number> {
        const Model = this._getModel<T>(collectionName)
        return Model.countDocuments(condition)
    }

    async aggregate<T = any>(
        collectionName: string,
        pipeline: PipelineStage[]
    ): Promise<T[]> {
        const Model = this._getModel<T>(collectionName)
        return Model.aggregate<T>(pipeline).exec()
    }

    async createIndex<T = any>(
        collectionName: string,
        fields: Record<string, any>,
        options: SyncIndexesOptions = {}
    ): Promise<string> {
        const Model = this._getModel<T>(collectionName)
        return Model.collection.createIndex(fields, options)
    }

    // 添加文本索引创建功能
    async createTextIndex<T = any>(
        collectionName: string,
        fields: Record<string, any>,
        options: SyncIndexesOptions = {}
    ): Promise<string> {
        const Model = this._getModel<T>(collectionName)
        // 将字段值设置为 'text' 字符串来创建文本索引
        const textFields: Record<string, 1 | -1 | 'text' | 'hashed' | 'geoHaystack'> = {}
        Object.keys(fields).forEach(key => {
            textFields[key] = 'text'
        })
        return Model.collection.createIndex(textFields, options)
    }

    // 添加地理空间索引创建功能
    async createGeoIndex<T = any>(
        collectionName: string,
        fields: Record<string, any>,
        indexType: '2dsphere' | '2d' | 'geoHaystack' = '2dsphere',
        options: SyncIndexesOptions = {}
    ): Promise<string> {
        const Model = this._getModel<T>(collectionName)
        return Model.collection.createIndex(fields, { ...options, [indexType]: true })
    }

    async getIndexes<T = any>(
        collectionName: string
    ): Promise<Record<string, any>> {
        const Model = this._getModel<T>(collectionName)
        return Model.collection.getIndexes()
    }

    async dropIndex<T = any>(collectionName: string, indexName: string) {
        const Model = this._getModel<T>(collectionName)
        return Model.collection.dropIndex(indexName)
    }

    // 添加删除所有索引功能
    async dropAllIndexes<T = any>(collectionName: string) {
        const Model = this._getModel<T>(collectionName)
        return Model.collection.dropIndexes()
    }

    async runTransaction<T>(
        callback: (session: ClientSession) => Promise<T>
    ): Promise<T | undefined> {
        const session = await mongoose.startSession()
        let result: T | undefined
        try {
            await session.withTransaction(async () => {
                result = await callback(session)
            })
        } finally {
            await session.endSession()
        }
        return result
    }

    // -------------------- 集合管理功能 --------------------

    // 检查集合是否存在
    async collectionExists(collectionName: string): Promise<boolean> {
        if (!mongoose.connection.db) {
            throw new Error('Database connection is not established')
        }
        const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray()
        return collections.length > 0
    }

    // 删除集合
    async dropCollection(collectionName: string): Promise<boolean> {
        if (await this.collectionExists(collectionName)) {
            const Model = this._getModel(collectionName)
            return Model.collection.drop()
        }
        return false
    }

    // 重命名集合
    async renameCollection(
        oldCollectionName: string,
        newCollectionName: string
    ): Promise<void> {
        const Model = this._getModel(oldCollectionName)
        await Model.collection.rename(newCollectionName)
    }

    // 获取所有集合名称
    async listCollections(): Promise<string[]> {
        if (!mongoose.connection.db) {
            throw new Error('Database connection is not established')
        }
        const collections = await mongoose.connection.db.listCollections().toArray()
        return collections.map(collection => collection.name)
    }

    // -------------------- 数据库级别操作 --------------------

    // 删除数据库
    async dropDatabase(): Promise<void> {
        if (!mongoose.connection.db) {
            throw new Error('Database connection is not established')
        }
        await mongoose.connection.db.dropDatabase()
    }

    // 获取数据库统计信息
    async dbStats(): Promise<any> {
        if (!mongoose.connection.db) {
            throw new Error('Database connection is not established')
        }
        return await mongoose.connection.db.stats()
    }
}