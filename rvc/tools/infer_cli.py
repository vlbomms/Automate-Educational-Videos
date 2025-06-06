import argparse
import os
import sys
import logging

now_dir = os.getcwd()
sys.path.append(now_dir)
from dotenv import load_dotenv
from scipy.io import wavfile

from configs.config import Config
from infer.modules.vc.modules import VC

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

####
# USAGE
#
# In your Terminal or CMD or whatever


def arg_parse() -> tuple:
    parser = argparse.ArgumentParser()
    parser.add_argument("--f0up_key", type=int, default=0)
    parser.add_argument("--input_path", type=str, help="input path")
    parser.add_argument("--index_path", type=str, help="index path")
    parser.add_argument("--f0method", type=str, default="harvest", help="harvest or pm")
    parser.add_argument("--opt_path", type=str, help="opt path")
    parser.add_argument("--model_name", type=str, help="store in assets/weight_root")
    parser.add_argument("--index_rate", type=float, default=0.66, help="index rate")
    parser.add_argument("--device", type=str, help="device")
    parser.add_argument("--is_half", type=bool, help="use half -> True")
    parser.add_argument("--filter_radius", type=int, default=3, help="filter radius")
    parser.add_argument("--resample_sr", type=int, default=0, help="resample sr")
    parser.add_argument("--rms_mix_rate", type=float, default=1, help="rms mix rate")
    parser.add_argument("--protect", type=float, default=0.33, help="protect")

    args = parser.parse_args()
    # Log all received arguments
    logger.info("Received arguments:")
    for arg in vars(args):
        logger.info(f"{arg}: {getattr(args, arg)}")
    
    sys.argv = sys.argv[:1]
    return args


def main():
    load_dotenv()
    args = arg_parse()
    config = Config()
    config.device = args.device if args.device else config.device
    config.is_half = args.is_half if args.is_half else config.is_half
    vc = VC(config)
    
    # Check if model_name is provided and exists
    if not args.model_name:
        logger.error("Error: model_name is required. Please provide --model_name parameter")
        sys.exit(1)
    
    # Log the model path we're looking for    
    model_path = os.path.join(os.getenv("weight_root", "weights"), args.model_name)
    logger.info(f"Looking for model at: {model_path}")
    
    if not os.path.exists(model_path):
        logger.error(f"Error: Model file not found at {model_path}")
        # Log the weight_root env var to help debug
        logger.info(f"weight_root env var: {os.getenv('weight_root', 'weights')}")
        logger.info(f"Current directory: {os.getcwd()}")
        sys.exit(1)
        
    vc.get_vc(args.model_name)
    _, wav_opt = vc.vc_single(
        0,
        args.input_path,
        args.f0up_key,
        None,
        args.f0method,
        args.index_path,
        None,
        args.index_rate,
        args.filter_radius,
        args.resample_sr,
        args.rms_mix_rate,
        args.protect,
    )
    wavfile.write(args.opt_path, wav_opt[0], wav_opt[1])


if __name__ == "__main__":
    main()
