
import React from 'react';

export type Config<F> = {
    schema: Schema<F>;
    initialValue: F;
    valueStringParsers: ValueStringParser<F>;
};

export type ParseStatus = 'full' | 'partial'

export type ValidatorFn<T> = (value: T) => boolean;

export type Validation<T> = {
    validator: ValidatorFn<T>;
    instantValidator?: ValidatorFn<T>;
    blockChangeOnError?: boolean;
    msg: string;
};

export type Schema<F> = {[P in keyof F]?: Validation<F[P]>[]};

export type FormError<F> = {
    [k in keyof F]: {
        error: boolean; 
        msg: string;
    }
};

export type ValueStringParser<F> = {[P in keyof F]: (v: string) => [ParseStatus, F[P]]}

type PData<F> = {[P in keyof F]: string};

type ValidForm = {[k: string | number | symbol]: string | number | string[] | number[] | ValidForm}
// type Form<F> = F extends ValidForm 
//     ? F
//     : undefined;

export function useForm<F extends ValidForm>({    
    initialValue,
    schema,
    valueStringParsers,
}: Config<F>) {
    const [data , setData] = React.useState<F>(initialValue);
    const [pData, setPData] = React.useState<PData<F>>((Object.keys(initialValue) as Array<keyof F>).reduce((acc, key) => { acc[key] = initialValue[key].toString(); return acc; }, {} as PData<F>));
    const [errors, setErrors] = React.useState<FormError<F>>((Object.keys(initialValue) as Array<keyof F>).reduce((acc, val) => { acc[val] = {error: false, msg: ""}; return acc;}, {} as FormError<F>));

    const handleDataChange = <P extends keyof F = keyof F>(key: P, value: F[P]) =>  {
        setErrors({...errors, [key]: {error: false, msg: ""}});
        const inputValidation = schema[key];
        if (inputValidation) {
            for(let i = 0; i < inputValidation.length; i++) {
                const cObj = inputValidation[i];
                const validator = inputValidation[i]?.instantValidator || inputValidation[i].validator;
                if(!validator(value)) {
                    setErrors({...errors, [key]: {error: true, msg: cObj.msg}});
                    if(inputValidation[i]?.blockChangeOnError) return;
                    break;
                }
            }
        }
        setData((data) => {
            const newVal = {...data, [key]: value};
            return newVal;
        });
    };

    const handleChange = <P extends keyof F = keyof F>(key: P, valueString: string) =>  {
        setErrors({...errors, [key]: {error: false, msg: ""}});
        const parser = valueStringParsers[key];
        const [proceedToValidate, value] = parser(valueString);
        if(proceedToValidate) {
            const inputValidation = schema[key];
            if (inputValidation) {
                for(let i = 0; i < inputValidation.length; i++) {
                    const cObj = inputValidation[i];
                    const validator = inputValidation[i]?.instantValidator || inputValidation[i].validator;
                    if(!validator(value)) {
                        setErrors({...errors, [key]: {error: true, msg: cObj.msg}});
                        if(inputValidation[i]?.blockChangeOnError) return;
                        break;
                    }
                }
            }
        }
        setPData((pData) => {
            const newVal = {...pData};
            newVal[key] = valueString;
            return newVal;
        });
    };
 
    const validate: () => boolean = () => {
        let isValid = true;
        let data: F = {...initialValue};
        const validationErrors = (Object.keys(initialValue) as Array<keyof F>).reduce((acc, val) => { acc[val] = {error: false, msg: ""}; return acc;}, {} as FormError<F>);
        const keys = Object.keys(schema) as Array<keyof Schema<F>>;
        for(let i =  0; i < keys.length; i++) {
            const key = keys[i];
            const value = schema[key];
            if(value) {
                for(let j = 0; j < value.length; j++) {
                    const vObj = value[j];
                    const [_, dataValue] = valueStringParsers[key](pData[key]);
                    data[key] = dataValue;
                    if(!vObj.validator(dataValue)) {
                        validationErrors[key].error = true;
                        validationErrors[key].msg = vObj.msg;
                        isValid = false;
                        break;
                    }
                }
            }
        }
        setErrors(validationErrors);
        if(isValid) {
            setData(data);
        }
        return isValid;
    };

    const resetData: () => void = () => {
        setData(initialValue);
    };

    const checkErrorOn = (key: keyof F) => {
        const [_, value] = valueStringParsers[key](pData[key]);
        const validators = schema[key];
        if(!validators) return;
        for(let i =0; i < validators.length; i++) {
            const validator = validators[i];
            if(!validator.validator(value)) {
                setErrors({...errors, [key]: {error: true, msg: validator.msg}});
                return;
            }
        }

        setErrors({...errors, [key]: {error: false, msg: ""}});
    }

    return {
        data,
        pData,
        handleChange,
        handleDataChange,
        validate,
        setErrors,
        errors,
        resetData,
        checkErrorOn,
    }
}