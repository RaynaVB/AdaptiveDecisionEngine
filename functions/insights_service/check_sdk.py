from firebase_functions import https_fn, options
import inspect

print("HttpsOptions members:")
print(dir(options.HttpsOptions))

print("\nhttps_fn.on_request signature:")
print(inspect.signature(https_fn.on_request))
